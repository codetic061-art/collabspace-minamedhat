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
import {
  authService,
  profileKeys,
  profileService,
  toAppError,
  type AppError,
  type ProfileMeData,
} from '@/shared/api';
import {
  broadcastSessionEvent,
  clearAuthToken,
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

/**
 * Provides app-wide authentication state (`unknown | authenticated | anonymous`),
 * startup `/auth/me` restore, centralized 401 redirection, and BroadcastChannel sync (ADR-01).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState<SessionState>(() =>
    hasStoredToken()
      ? { status: 'unknown', me: null, role: null, startupError: null }
      : ANONYMOUS_STATE,
  );

  const locationRef = useRef(location);
  const statusRef = useRef(state.status);
  useEffect(() => {
    locationRef.current = location;
    statusRef.current = state.status;
  });

  const restoreSession = useCallback(
    async (signal?: AbortSignal) => {
      if (!hasStoredToken()) {
        setState(ANONYMOUS_STATE);
        return;
      }

      setState((prev) => ({ ...prev, status: 'unknown', startupError: null }));

      try {
        const me = await profileService.getMe(signal);
        queryClient.setQueryData(profileKeys.me(), me);
        resetUnauthorizedGuard();
        setState({
          status: 'authenticated',
          me,
          role: normalizeSystemRole(me.user.roles),
          startupError: null,
        });
      } catch (error) {
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
    void restoreSession(controller.signal);
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
        const currentFullPath = `${loc.pathname}${loc.search}${loc.hash}`;
        const safeReturn = sanitizeReturnPath(currentFullPath, '/');
        const target =
          safeReturn === '/'
            ? '/sign-in'
            : `/sign-in?redirectTo=${encodeURIComponent(safeReturn)}`;
        navigate(target, { replace: true });
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
          const currentFullPath = `${loc.pathname}${loc.search}${loc.hash}`;
          const safeReturn = sanitizeReturnPath(currentFullPath, '/');
          const target =
            safeReturn === '/'
              ? '/sign-in'
              : `/sign-in?redirectTo=${encodeURIComponent(safeReturn)}`;
          navigate(target, { replace: true });
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
    async (token: string, options: { remember?: boolean } = {}) => {
      setAuthToken(token, { remember: options.remember });
      try {
        const me = await profileService.getMe();
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
        clearAuthToken();
        queryClient.clear();
        setState(ANONYMOUS_STATE);
        throw error;
      }
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Explicit sign-out always clears local credentials even on network/server failure (ADR-01).
    } finally {
      clearAuthToken();
      queryClient.clear();
      broadcastSessionEvent('signed-out');
      setState(ANONYMOUS_STATE);
    }
  }, [queryClient]);

  const clearSessionAfterReset = useCallback(() => {
    clearAuthToken();
    queryClient.clear();
    broadcastSessionEvent('signed-out');
    setState(ANONYMOUS_STATE);
  }, [queryClient]);

  const retryRestore = useCallback(async () => {
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
