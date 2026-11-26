import { AlertCircle } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { useSession } from '@/features/auth';
import { getErrorMessage } from '@/shared/api';
import { sanitizeReturnPath } from '@/shared/lib';
import { Button, PageStatusState } from '@/shared/ui';
import { NeutralLoadingShell } from './NeutralLoadingShell';

const LazyAppShell = lazy(async () => {
  const { AppShell } = await import('./AppShell');
  return { default: AppShell };
});

/** Protects authenticated routes with a neutral loading shell on reload and safe return paths. */
export function ProtectedRoute() {
  const { status, startupError, retryRestore } = useSession();
  const location = useLocation();

  if (startupError && status === 'unknown') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
        <PageStatusState
          icon={<AlertCircle className="h-6 w-6" aria-hidden="true" />}
          tone="danger"
          title="Unable to verify your session"
          message={getErrorMessage(startupError)}
          action={
            <Button type="button" onClick={() => void retryRestore()}>
              Retry
            </Button>
          }
        />
      </main>
    );
  }

  if (status === 'unknown') {
    return <NeutralLoadingShell />;
  }

  if (status === 'anonymous') {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    const safeReturn = sanitizeReturnPath(fullPath, '/');
    const target =
      safeReturn === '/' ? '/sign-in' : `/sign-in?redirectTo=${encodeURIComponent(safeReturn)}`;
    return <Navigate to={target} replace />;
  }

  return (
    <Suspense fallback={<NeutralLoadingShell />}>
      <LazyAppShell />
    </Suspense>
  );
}

/** Guards public auth routes: holds neutral shell during `unknown` and redirects signed-in users. */
export function PublicOnlyRoute() {
  const { status, startupError } = useSession();
  const [searchParams] = useSearchParams();

  if (status === 'unknown' && !startupError) {
    return <NeutralLoadingShell />;
  }

  if (status === 'authenticated') {
    const target = sanitizeReturnPath(searchParams.get('redirectTo'), '/');
    return <Navigate to={target} replace />;
  }

  return (
    <Suspense fallback={<NeutralLoadingShell />}>
      <Outlet />
    </Suspense>
  );
}
