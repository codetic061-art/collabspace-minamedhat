import type { ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Button } from '@/shared/ui';
import { isChunkLoadError } from './preloadError';

function RootFallback({ error, resetErrorBoundary }: FallbackProps) {
  const isChunkError = isChunkLoadError(error);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <div
        role="alert"
        className="w-full max-w-md rounded-card border border-border-subtle bg-surface p-8 text-center shadow-auth"
      >
        <h1 className="text-xl font-semibold text-ink">
          {isChunkError ? 'A new version is available' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {isChunkError
            ? 'Please reload the page to load the latest version of CollabSpace.'
            : 'An unexpected error occurred while rendering the application.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          {!isChunkError ? (
            <Button type="button" variant="outline" onClick={resetErrorBoundary}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

/** Top-level React error boundary providing a safe full-page fallback (ID-17, ADR-07). */
export function RootErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary FallbackComponent={RootFallback}>{children}</ErrorBoundary>;
}
