import { Outlet } from 'react-router';
import { SessionProvider } from '@/features/auth';

/** Binds the session provider inside the router's navigation context. */
export function SessionRoot() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  );
}
