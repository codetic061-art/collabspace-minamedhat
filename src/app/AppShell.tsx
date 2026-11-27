import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { NeutralLoadingShell } from './NeutralLoadingShell';
import { Navbar } from './Navbar';

/** Authenticated shell wrapping `Navbar` and lazy-loaded protected `<main>` routes. */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar />
      <main id="main-content" className="w-full px-4 py-6 sm:px-6 lg:px-16">
        <Suspense fallback={<NeutralLoadingShell />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
