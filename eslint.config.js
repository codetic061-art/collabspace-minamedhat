import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TEST_FILES = ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'];

const NO_RESTRICTED_SYNTAX_BASE = [
  {
    selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
    message: 'dangerouslySetInnerHTML is forbidden by security policy (ADR-01, ID-20.5).',
  },
  {
    selector: 'MemberExpression[object.name="process"][property.name="env"]',
    message: 'process.env is forbidden in browser code. Use getPublicEnv() from @/shared/config.',
  },
];

const NO_RESTRICTED_SYNTAX_SRC = [
  ...NO_RESTRICTED_SYNTAX_BASE,
  {
    selector:
      'MemberExpression[object.type="MetaProperty"][object.meta.name="import"][object.property.name="meta"][property.name="env"]',
    message:
      'Direct import.meta.env reads are forbidden outside src/shared/config/env.ts. Use getPublicEnv() from @/shared/config.',
  },
];

const BASE_RESTRICTED_PATHS = [
  {
    name: 'react-router-dom',
    message: 'Import from "react-router" instead of "react-router-dom" (React Router v8, ADR-02).',
  },
];

const DEEP_FEATURE_PATTERN = {
  group: ['@/features/*/*', '@/features/*/**'],
  message:
    'Import from a feature public entry point (@/features/<name>) instead of deep feature internals (ADR-03).',
};

const TEST_IMPORT_PATTERN = {
  group: ['@/test', '@/test/**'],
  message: 'Production code must not import test utilities or fixtures (ADR-10).',
};

function makeRestrictedImports(extraPatterns = []) {
  return [
    'error',
    {
      paths: BASE_RESTRICTED_PATHS,
      patterns: [DEEP_FEATURE_PATTERN, TEST_IMPORT_PATTERN, ...extraPatterns],
    },
  ];
}

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'preview-shots/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...reactHooks.configs.flat.recommended,
    files: ['src/**/*.{ts,tsx}'],
  },
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['src/**/*.{ts,tsx}'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'no-restricted-syntax': ['error', ...NO_RESTRICTED_SYNTAX_SRC],
      'no-restricted-imports': makeRestrictedImports(),
    },
  },
  {
    files: ['src/shared/config/env.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_RESTRICTED_SYNTAX_BASE],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/api/httpClient.ts', ...TEST_FILES],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Direct fetch() calls are forbidden outside src/shared/api/httpClient.ts (ADR-05).',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/legacy-warnings': false,
      'boundaries/include': ['src/**/*'],
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        },
      },
      'boundaries/elements': [
        { type: 'entry', pattern: 'src/main.tsx', mode: 'file' },
        { type: 'app', pattern: 'src/app', mode: 'folder' },
        {
          type: 'feature',
          pattern: 'src/features/*',
          capture: ['featureName'],
          mode: 'folder',
        },
        { type: 'shared-ui', pattern: 'src/shared/ui', mode: 'folder' },
        { type: 'shared-api', pattern: 'src/shared/api', mode: 'folder' },
        { type: 'shared-lib', pattern: 'src/shared/lib', mode: 'folder' },
        { type: 'shared-tokens', pattern: 'src/shared/tokens', mode: 'folder' },
        { type: 'shared-config', pattern: 'src/shared/config', mode: 'folder' },
        { type: 'test', pattern: 'src/test', mode: 'folder' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'entry',
              allow: [
                'app',
                'shared-tokens',
                'shared-ui',
                'shared-api',
                'shared-lib',
                'shared-config',
              ],
            },
            {
              from: 'app',
              allow: [
                'app',
                'feature',
                'shared-ui',
                'shared-api',
                'shared-lib',
                'shared-tokens',
                'shared-config',
              ],
            },
            {
              from: 'feature',
              allow: [
                'feature',
                'shared-ui',
                'shared-api',
                'shared-lib',
                'shared-tokens',
                'shared-config',
              ],
            },
            {
              from: 'shared-ui',
              allow: ['shared-ui', 'shared-tokens'],
            },
            {
              from: 'shared-api',
              allow: ['shared-api', 'shared-lib', 'shared-config'],
            },
            {
              from: 'shared-lib',
              allow: ['shared-lib', 'shared-config'],
            },
            {
              from: 'shared-tokens',
              allow: ['shared-tokens'],
            },
            {
              from: 'shared-config',
              allow: ['shared-config'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': makeRestrictedImports([
        {
          group: ['@/app', '@/app/**'],
          message: 'Features must not import from src/app (ADR-03).',
        },
      ]),
    },
  },
  {
    files: ['src/shared/ui/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': makeRestrictedImports([
        {
          group: [
            '@/app',
            '@/app/**',
            '@/features',
            '@/features/**',
            '@/shared/api',
            '@/shared/api/**',
            '@/shared/lib',
            '@/shared/lib/**',
            '@/shared/config',
            '@/shared/config/**',
          ],
          message:
            'src/shared/ui may import only from src/shared/tokens and src/shared/ui (ADR-03).',
        },
      ]),
    },
  },
  {
    files: ['src/shared/api/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': makeRestrictedImports([
        {
          group: [
            '@/app',
            '@/app/**',
            '@/features',
            '@/features/**',
            '@/shared/ui',
            '@/shared/ui/**',
          ],
          message:
            'src/shared/api may import only from src/shared/api, src/shared/lib, and src/shared/config (ADR-03).',
        },
      ]),
    },
  },
  {
    files: ['src/shared/lib/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': makeRestrictedImports([
        {
          group: [
            '@/app',
            '@/app/**',
            '@/features',
            '@/features/**',
            '@/shared/ui',
            '@/shared/ui/**',
            '@/shared/api',
            '@/shared/api/**',
          ],
          message:
            'src/shared/lib may import only from src/shared/lib and src/shared/config (ADR-03).',
        },
      ]),
    },
  },
  {
    files: ['src/shared/tokens/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': makeRestrictedImports([
        {
          group: [
            '@/app',
            '@/app/**',
            '@/features',
            '@/features/**',
            '@/shared/ui',
            '@/shared/ui/**',
            '@/shared/api',
            '@/shared/api/**',
            '@/shared/lib',
            '@/shared/lib/**',
            '@/shared/config',
            '@/shared/config/**',
          ],
          message: 'src/shared/tokens may import only from src/shared/tokens (ADR-03).',
        },
      ]),
    },
  },
  {
    files: ['src/shared/config/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': makeRestrictedImports([
        {
          group: [
            '@/app',
            '@/app/**',
            '@/features',
            '@/features/**',
            '@/shared/ui',
            '@/shared/ui/**',
            '@/shared/api',
            '@/shared/api/**',
            '@/shared/lib',
            '@/shared/lib/**',
          ],
          message: 'src/shared/config may import only from src/shared/config (ADR-03).',
        },
      ]),
    },
  },
  {
    files: TEST_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: BASE_RESTRICTED_PATHS,
        },
      ],
    },
  },
  {
    files: ['e2e/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
