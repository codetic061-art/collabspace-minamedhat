// @vitest-environment node
import { build, type Plugin } from 'vite';
import { it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000 });

// prettier-ignore
it('reports modules added to the entry bundle by the Dashboard route', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://collabspace.huma-volve.com/api/v1');
  async function inspect(withDashboard: boolean) {
    const modules = new Map<string, number>();
    const inspectPlugin: Plugin = {
      name: 'dashboard-bundle-diagnostic',
      enforce: 'pre',
      transform(code, id) {
        if (withDashboard || !id.replaceAll('\\', '/').endsWith('/src/app/router.tsx')) {
          return;
        }
        const route = `lazy: async () => {
                const { loadDashboardPage } = await import('@/features/dashboard');
                return loadDashboardPage();
              },`;
        if (!code.includes(route)) {
          throw new Error('Dashboard route was not found');
        }
        return code.replace(
          route,
          `lazy: async () => {
                const { DashboardPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: DashboardPlaceholderPage };
              },`,
        );
      },
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type === 'chunk' && output.isEntry) {
            for (const [name, info] of Object.entries(output.modules)) {
              modules.set(name.split('/').slice(-4).join('/'), info.renderedLength);
            }
          }
        }
      },
    };
    await build({ build: { write: false }, plugins: [inspectPlugin] });
    return modules;
  }

  const baseline = await inspect(false);
  const dashboard = await inspect(true);
  const differences = [...dashboard].map(([name, size]) => ({
    name,
    added: size - (baseline.get(name) ?? 0),
  }));
  console.log('Dashboard entry differences:', differences.filter((item) => item.added > 0));
});
