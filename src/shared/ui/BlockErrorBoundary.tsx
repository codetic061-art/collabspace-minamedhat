import type { ErrorInfo, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BlockErrorState } from './StatePrimitives';

export interface BlockErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  onError?: (error: unknown, info: ErrorInfo) => void;
  resetKeys?: unknown[];
  className?: string;
}

/** Card/section-level error boundary isolating crashes without leaking stack traces (ID-17, ADR-07). */
export function BlockErrorBoundary({
  children,
  fallbackTitle,
  fallbackMessage = 'Something went wrong. Please try again.',
  onReset,
  onError,
  resetKeys,
  className,
}: BlockErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKeys={resetKeys}
      onReset={onReset}
      onError={onError}
      fallbackRender={({ resetErrorBoundary }) => (
        <BlockErrorState
          title={fallbackTitle}
          message={fallbackMessage}
          onRetry={resetErrorBoundary}
          className={className}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
