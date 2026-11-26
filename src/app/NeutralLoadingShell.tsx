import { Skeleton, SkeletonRegion } from '@/shared/ui';

/**
 * Neutral shell rendered while session state is `'unknown'` or lazy route chunks resolve (ID-20.2).
 * Displays neither sign-in form nor protected UI so reloads never flash stale state.
 */
export function NeutralLoadingShell() {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="h-navbar border-b border-border-subtle bg-surface px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-pill" />
          <div className="hidden lg:flex items-center gap-4">
            <Skeleton className="h-8 w-24 rounded-pill" />
            <Skeleton className="h-8 w-24 rounded-pill" />
            <Skeleton className="h-8 w-20 rounded-pill" />
          </div>
          <Skeleton className="h-9 w-28 rounded-pill" />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SkeletonRegion label="Loading application" className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
          </div>
          <Skeleton className="h-64 w-full rounded-card" />
        </SkeletonRegion>
      </main>
    </div>
  );
}
