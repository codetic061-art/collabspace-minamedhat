import { useMemo } from 'react';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from './providers';
import { createAppBrowserRouter } from './router';

/** Root application component mounting providers and the lazy data router. */
export function App() {
  const router = useMemo(() => createAppBrowserRouter(), []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
