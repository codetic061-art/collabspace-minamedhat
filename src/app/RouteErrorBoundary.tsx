import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { BlockErrorState, Button, NotFoundState } from '@/shared/ui';
import { isChunkLoadError } from './preloadError';

/** Route-level error boundary rendering safe user messages and chunk-reload recovery (ID-17, ID-18). */
export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center p-6">
        <NotFoundState
          title="Page not found"
          message="The page you requested does not exist."
          action={
            <Link
              to="/"
              className="inline-flex min-h-touch items-center rounded-pill bg-primary px-5 text-sm font-medium text-surface hover:bg-primary/90"
            >
              Back to Dashboard
            </Link>
          }
        />
      </main>
    );
  }

  if (isChunkLoadError(error)) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center p-6">
        <div
          role="alert"
          className="w-full rounded-card border border-border-subtle bg-surface p-8 text-center shadow-auth"
        >
          <h1 className="text-xl font-semibold text-ink">New version available</h1>
          <p className="mt-2 text-sm text-gray-500">
            CollabSpace has been updated. Reload the page to continue.
          </p>
          <div className="mt-6">
            <Button type="button" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center p-6">
      <BlockErrorState
        title="Unable to load this page"
        message="Something unexpected happened while loading this screen."
        onRetry={() => window.location.reload()}
      />
    </main>
  );
}
