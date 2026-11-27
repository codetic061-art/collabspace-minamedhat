import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { SessionProvider } from '@/features/auth';
import { createAppQueryClient } from '@/shared/api';
import { ToastProvider } from '@/shared/ui';
import { RootErrorBoundary } from './RootErrorBoundary';

export interface AppProvidersProps {
  queryClient?: QueryClient;
  children: ReactNode;
}

/** Wraps the router with root error boundary, TanStack Query cache, and polite Toast region. */
export function AppProviders({ queryClient: injectedClient, children }: AppProvidersProps) {
  const [defaultClient] = useState(() => createAppQueryClient());
  const client = injectedClient ?? defaultClient;

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}

/** Root route wrapper binding `SessionProvider` cleanly inside React Router navigation context. */
export function SessionRoot() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  );
}
