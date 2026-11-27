import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { profileKeys, toAppError, type AppError, type ProfileMeData } from '@/shared/api';
import { logout } from '@/shared/api/services/auth.service';
import { getMe } from '@/shared/api/services/profile.service';
import {
  broadcastSessionEvent,
  clearAuthToken,
  getSessionEpoch,
  hasRememberedToken,
  hasStoredToken,
  normalizeSystemRole,
  registerUnauthorizedHandler,
  resetUnauthorizedGuard,
  sanitizeReturnPath,
  setAuthToken,
  subscribeSessionEvents,
  type SystemRole,
} from '@/shared/lib';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

export interface SessionContextValue {
  status: SessionStatus;
  me: ProfileMeData | null;
  user: ProfileMeData['user'] | null;
  role: SystemRole | null;
  startupError: AppError | null;
  retryRestore: () => Promise<void>;
  completeAuth: (token: string, options?: { remember?: boolean }) => Promise<ProfileMeData>;
  signOut: () => Promise<void>;
  clearSessionAfterReset: () => void;
}

const PUBLIC_AUTH_ROUTES = new Set([
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/verify-code',
  '/reset-password',
]);

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.has(pathname);
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionState {
  status: SessionStatus;
  me: ProfileMeData | null;
  role: SystemRole | null;
  startupError: AppError | null;
}

const ANONYMOUS_STATE: SessionState = {
  status: 'anonymous',
  me: null,
  role: null,
  startupError: null,
};

interface RedirectLocation {
  pathname: string;
  search: string;
  hash: string;
}

function buildSignInRedirectPath(loc: RedirectLocation): string {
  const currentFullPath = `${loc.pathname}${loc.search}${loc.hash}`;
  const safeReturn = sanitizeReturnPath(currentFullPath, '/');
  if (safeReturn === '/') {
    return '/sign-in';
  }
  return `/sign-in?redirectTo=${encodeURIComponent(safeReturn)}`;
}

function getInitialSessionState(): SessionState {
  if (hasStoredToken()) {
    return { status: 'unknown', me: null, role: null, startupError: null };
  }
  return ANONYMOUS_STATE;
}

/**
 * Provides app-wide authentication state (`unknown | authenticated | anonymous`),
 * startup `/auth/me` restore, centralized 401 redirection, and BroadcastChannel sync (ADR-01).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState<SessionState>(getInitialSessionState);

  const locationRef = useRef(location);
  const statusRef = useRef(state.status);
  useEffect(() => {
    locationRef.current = location;
    statusRef.current = state.status;
  });

  const restoreSession = useCallback(
    async ({ signal }: { signal?: AbortSignal } = {}): Promise<void> => {
      const epoch = getSessionEpoch();
      try {
        const me = await getMe(signal);
        if (signal?.aborted || epoch !== getSessionEpoch()) return;
        queryClient.setQueryData(profileKeys.me(), me);
        resetUnauthorizedGuard();
        setState({
          status: 'authenticated',
          me,
          role: normalizeSystemRole(me.user.roles),
          startupError: null,
        });
      } catch (error) {
        if (signal?.aborted || epoch !== getSessionEpoch()) return;
        const appError = toAppError(error);
        if (appError.kind === 'aborted') {
          return;
        }
        if (appError.kind === 'unauthorized') {
          clearAuthToken();
          queryClient.clear();
          setState(ANONYMOUS_STATE);
          return;
        }
        // Preserve stored token on transient startup errors so user can retry (ADR-01 §3).
        setState({
          status: 'unknown',
          me: null,
          role: null,
          startupError: appError,
        });
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!hasStoredToken()) {
      return;
    }

    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) void restoreSession({ signal: controller.signal });
    });
    return () => {
      controller.abort();
    };
  }, [restoreSession]);

  useEffect(() => {
    const unregister = registerUnauthorizedHandler(() => {
      clearAuthToken();
      queryClient.clear();
      broadcastSessionEvent('signed-out');
      setState(ANONYMOUS_STATE);

      const loc = locationRef.current;
      if (!isPublicAuthPath(loc.pathname)) {
        navigate(buildSignInRedirectPath(loc), { replace: true });
      }
    });

    return unregister;
  }, [navigate, queryClient]);

  useEffect(() => {
    return subscribeSessionEvents((event) => {
      if (event.type === 'signed-out') {
        clearAuthToken();
        queryClient.clear();
        setState(ANONYMOUS_STATE);

        const loc = locationRef.current;
        if (!isPublicAuthPath(loc.pathname)) {
          navigate(buildSignInRedirectPath(loc), { replace: true });
        }
      } else if (
        event.type === 'signed-in' &&
        hasRememberedToken() &&
        statusRef.current !== 'authenticated'
      ) {
        void restoreSession();
      }
    });
  }, [navigate, queryClient, restoreSession]);

  const completeAuth = useCallback(
    async (token: string, options?: { remember?: boolean }): Promise<ProfileMeData> => {
      setAuthToken(token, { remember: options?.remember });
      const epoch = getSessionEpoch();
      try {
        const me = await getMe();
        if (epoch !== getSessionEpoch()) throw new Error('Session changed during sign-in.');
        queryClient.setQueryData(profileKeys.me(), me);
        resetUnauthorizedGuard();
        broadcastSessionEvent('signed-in');
        setState({
          status: 'authenticated',
          me,
          role: normalizeSystemRole(me.user.roles),
          startupError: null,
        });
        return me;
      } catch (error) {
        if (epoch === getSessionEpoch()) {
          clearAuthToken();
          queryClient.clear();
          setState(ANONYMOUS_STATE);
        }
        throw error;
      }
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    const epoch = getSessionEpoch();
    try {
      await logout();
    } catch {
      // Explicit sign-out always clears local credentials even on network/server failure (ADR-01).
    } finally {
      if (epoch === getSessionEpoch()) {
        clearAuthToken();
        queryClient.clear();
        broadcastSessionEvent('signed-out');
        setState(ANONYMOUS_STATE);
      }
    }
  }, [queryClient]);

  const clearSessionAfterReset = useCallback(() => {
    clearAuthToken();
    queryClient.clear();
    broadcastSessionEvent('signed-out');
    setState(ANONYMOUS_STATE);
  }, [queryClient]);

  const retryRestore = useCallback(async () => {
    if (!hasStoredToken()) {
      setState(ANONYMOUS_STATE);
      return;
    }
    setState((prev) => ({ ...prev, status: 'unknown', startupError: null }));
    await restoreSession();
  }, [restoreSession]);

  return (
    <SessionContext.Provider
      value={{
        status: state.status,
        me: state.me,
        user: state.me?.user ?? null,
        role: state.role,
        startupError: state.startupError,
        retryRestore,
        completeAuth,
        signOut,
        clearSessionAfterReset,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

/** Reads the active session state and auth lifecycle actions. Must be called inside `SessionProvider`. */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>.');
  }
  return ctx;
}
