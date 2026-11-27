import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from './cn';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  id?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number;
}

export interface ToastContextValue {
  showToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Returns `{ showToast, dismissToast }` from the nearest `<ToastProvider>`. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return ctx;
}

const TONE_ICON_STYLES: Record<ToastTone, string> = {
  success: 'bg-success-tint text-success',
  error: 'bg-danger-tint text-danger',
  info: 'bg-primary-tint text-primary',
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') {
    return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  }
  if (tone === 'error') {
    return <AlertCircle className="h-4 w-4" aria-hidden="true" />;
  }
  return <Info className="h-4 w-4" aria-hidden="true" />;
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef(toast.durationMs);
  const startedAtRef = useRef(0);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);

  const clearScheduledTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (toast.durationMs <= 0 || timerRef.current !== null) {
      return;
    }
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onDismiss(toast.id);
    }, remainingRef.current);
  }, [onDismiss, toast.durationMs, toast.id]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current === null) {
      return;
    }
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearScheduledTimer();
  }, [clearScheduledTimer]);

  useEffect(() => {
    remainingRef.current = toast.durationMs;
    startTimer();
    return clearScheduledTimer;
  }, [toast.durationMs, startTimer, clearScheduledTimer]);

  const handleMouseEnter = () => {
    hoveredRef.current = true;
    pauseTimer();
  };

  const handleMouseLeave = () => {
    hoveredRef.current = false;
    if (!focusedRef.current) {
      startTimer();
    }
  };

  const handleFocusCapture = () => {
    focusedRef.current = true;
    pauseTimer();
  };

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) {
      return;
    }
    focusedRef.current = false;
    if (!hoveredRef.current) {
      startTimer();
    }
  };

  return (
    <div
      role="status"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      className="pointer-events-auto flex w-full sm:w-80 items-center gap-3 rounded-card border border-border-subtle bg-surface p-3.5 shadow-popover"
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill',
          TONE_ICON_STYLES[toast.tone],
        )}
      >
        <ToastIcon tone={toast.tone} />
      </span>

      <p className="min-w-0 flex-1 text-sm font-medium text-ink">{toast.message}</p>

      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-pill text-body hover:bg-surface-input hover:text-ink cursor-pointer"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export interface ToastRegionProps {
  toasts: readonly ToastItem[];
  onDismiss: (id: string) => void;
  className?: string;
}

/** Bottom-right polite live region rendering active toast notifications (ID-23). */
export function ToastRegion({ toasts, onDismiss, className }: ToastRegionProps) {
  return (
    <div
      data-toast-region=""
      role="region"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Notifications"
      className={cn(
        'pointer-events-none fixed right-4 bottom-4 left-4 sm:left-auto z-50 flex flex-col gap-2.5',
        className,
      )}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export interface ToastProviderProps {
  defaultDurationMs?: number;
  disablePortal?: boolean;
  children: ReactNode;
}

/** Provides `useToast()` context and mounts `<ToastRegion>` for status feedback. */
export function ToastProvider({
  defaultDurationMs = 4000,
  disablePortal = false,
  children,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextSeqRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ id, message, tone = 'success', durationMs }: ToastInput): string => {
      nextSeqRef.current += 1;
      const toastId = id ?? `toast-${nextSeqRef.current}`;
      const resolvedDuration = durationMs ?? defaultDurationMs;

      setToasts((prev) => [
        ...prev.filter((item) => item.id !== toastId),
        { id: toastId, message, tone, durationMs: resolvedDuration },
      ]);

      return toastId;
    },
    [defaultDurationMs],
  );

  const contextValue = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);
  const region = <ToastRegion toasts={toasts} onDismiss={dismissToast} />;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {disablePortal || typeof document === 'undefined'
        ? region
        : createPortal(region, document.body)}
    </ToastContext.Provider>
  );
}
