/**
 * Public entry for the Dashboard feature (ADR-03). The central router is owned by the
 * integration owner, so this module exposes the lazy route loader it should register:
 *
 * ```ts
 * { index: true, lazy: loadDashboardPage }
 * ```
 */
export async function loadDashboardPage() {
  const { DashboardPage } = await import('./pages/DashboardPage');
  return { Component: DashboardPage };
}
