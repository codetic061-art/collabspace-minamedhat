import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, type Plugin, type PluginOption } from 'vite';

const FORBIDDEN_PUBLIC_KEY_PATTERN = /SECRET|PRIVATE|TOKEN|PASSWORD/i;

function validateBuildPublicEnv(): Plugin {
  return {
    name: 'validate-build-public-env',
    configResolved(resolvedConfig) {
      if (resolvedConfig.command !== 'build') {
        return;
      }

      const isCiOrVercel = process.env.VERCEL === '1' || process.env.CI === 'true';
      if (!isCiOrVercel) {
        return;
      }

      const allKeys = new Set([...Object.keys(resolvedConfig.env), ...Object.keys(process.env)]);

      for (const key of allKeys) {
        if (key.startsWith('VITE_') && FORBIDDEN_PUBLIC_KEY_PATTERN.test(key)) {
          throw new Error(
            `Forbidden secret-like public env variable "${key}" detected in build environment.`,
          );
        }
      }

      const apiBaseUrl = resolvedConfig.env.VITE_API_BASE_URL ?? process.env.VITE_API_BASE_URL;
      if (typeof apiBaseUrl !== 'string' || !apiBaseUrl.startsWith('https://')) {
        throw new Error(
          'Missing or invalid VITE_API_BASE_URL for build: must be set and start with "https://".',
        );
      }

      try {
        new URL(apiBaseUrl);
      } catch {
        throw new Error(
          `Invalid VITE_API_BASE_URL for build: "${apiBaseUrl}" is not a valid HTTPS URL.`,
        );
      }
    },
  };
}

export default defineConfig(() => {
  const plugins: PluginOption[] = [react(), tailwindcss(), validateBuildPublicEnv()];

  if (process.env.ANALYZE === 'true') {
    plugins.push(
      // rollup-plugin-visualizer returns a Rollup Plugin type compatible with Vite 8 PluginOption
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        template: 'treemap',
      }) as PluginOption,
    );
  }

  return {
    plugins,
    build: {
      rolldownOptions: {
        treeshake: {
          moduleSideEffects: (id) =>
            !/[/\\]src[/\\]shared[/\\](ui[/\\](Avatar|Badge|Breadcrumb|ConfirmDialog|DropdownMenu|Modal|ProgressBar|Select|StatePrimitives|Tabs)|api[/\\](dates|services[/\\](dashboard|projects|tasks|teams|users)\.service))\.(ts|tsx)$/.test(
              id,
            ),
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
