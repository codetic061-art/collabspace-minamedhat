import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Outlet } from 'react-router';
import { subscribeSessionEvents } from '@/shared/lib';

const DEFAULT_EXPIRY_MINUTES = 10;

export interface RecoveryFlowData {
  email: string;
  expiresInMinutes: number;
  otp: string | null;
}

export interface RecoveryFlowContextValue {
  recovery: RecoveryFlowData | null;
  startRecovery: (email: string, expiresInMinutes: number) => void;
  updateExpiry: (expiresInMinutes: number) => void;
  setVerifiedOtp: (otp: string) => void;
  clearRecovery: () => void;
}

const RecoveryFlowContext = createContext<RecoveryFlowContextValue | null>(null);

function normalizeExpiryMinutes(minutes: number): number {
  return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_EXPIRY_MINUTES;
}

/**
 * Holds password recovery email and OTP strictly in memory across recovery steps
 * (ID-21, ADR-01). Never touches history.state, URLs, or Web Storage.
 */
export function RecoveryFlowProvider({ children }: { children: ReactNode }) {
  const [recovery, setRecovery] = useState<RecoveryFlowData | null>(null);

  useEffect(() => {
    return subscribeSessionEvents((event) => {
      if (event.type === 'signed-out') {
        setRecovery(null);
      }
    });
  }, []);

  const startRecovery = useCallback((email: string, expiresInMinutes: number) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setRecovery(null);
      return;
    }
    setRecovery({
      email: trimmedEmail,
      expiresInMinutes: normalizeExpiryMinutes(expiresInMinutes),
      otp: null,
    });
  }, []);

  const updateExpiry = useCallback((expiresInMinutes: number) => {
    const normalized = normalizeExpiryMinutes(expiresInMinutes);
    setRecovery((prev) => (prev ? { ...prev, expiresInMinutes: normalized } : prev));
  }, []);

  const setVerifiedOtp = useCallback((otp: string) => {
    setRecovery((prev) => (prev ? { ...prev, otp } : prev));
  }, []);

  const clearRecovery = useCallback(() => {
    setRecovery(null);
  }, []);

  return (
    <RecoveryFlowContext.Provider
      value={{ recovery, startRecovery, updateExpiry, setVerifiedOtp, clearRecovery }}
    >
      {children}
    </RecoveryFlowContext.Provider>
  );
}

/**
 * Route layout scoping the in-memory recovery store exclusively to the three
 * password recovery routes; unmounting automatically discards transient state.
 */
export function RecoveryFlowLayout() {
  return (
    <RecoveryFlowProvider>
      <Outlet />
    </RecoveryFlowProvider>
  );
}

/** Reads the in-memory password recovery session inside `<RecoveryFlowProvider>`. */
export function useRecoveryFlow(): RecoveryFlowContextValue {
  const ctx = useContext(RecoveryFlowContext);
  if (!ctx) {
    throw new Error('useRecoveryFlow must be used inside <RecoveryFlowProvider>.');
  }
  return ctx;
}
