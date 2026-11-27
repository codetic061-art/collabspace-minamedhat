const TEST_DEFAULT_API_BASE_URL = 'https://collabspace.huma-volve.com/api/v1';

const FORBIDDEN_PUBLIC_KEY_PATTERN = /SECRET|PRIVATE|TOKEN|PASSWORD|SALT/i;

// Standard non-secret metadata keys Vercel auto-exposes to Vite builds when System Env Vars are enabled.
const VERCEL_PUBLIC_SYSTEM_KEYS = [
  'VITE_VERCEL_ENV',
  'VITE_VERCEL_TARGET_ENV',
  'VITE_VERCEL_URL',
  'VITE_VERCEL_BRANCH_URL',
  'VITE_VERCEL_PROJECT_PRODUCTION_URL',
  'VITE_VERCEL_REGION',
  'VITE_VERCEL_DEPLOYMENT_ID',
  'VITE_VERCEL_PROJECT_ID',
  'VITE_VERCEL_PROJECT_NAME',
  'VITE_VERCEL_SKEW_PROTECTION_ENABLED',
  'VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG',
  'VITE_VERCEL_GIT_PROVIDER',
  'VITE_VERCEL_GIT_REPO_SLUG',
  'VITE_VERCEL_GIT_REPO_OWNER',
  'VITE_VERCEL_GIT_REPO_ID',
  'VITE_VERCEL_GIT_COMMIT_REF',
  'VITE_VERCEL_GIT_COMMIT_SHA',
  'VITE_VERCEL_GIT_COMMIT_MESSAGE',
  'VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN',
  'VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME',
  'VITE_VERCEL_GIT_PREVIOUS_SHA',
  'VITE_VERCEL_GIT_PULL_REQUEST_ID',
] as const;

const ALLOWED_ENV_KEYS = new Set<string>([
  'VITE_API_BASE_URL',
  'VITE_TURNSTILE_ENABLED',
  'VITE_TURNSTILE_SITEKEY',
  'MODE',
  'BASE_URL',
  'PROD',
  'DEV',
  'SSR',
  ...VERCEL_PUBLIC_SYSTEM_KEYS,
]);

export interface PublicEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_TURNSTILE_ENABLED: boolean;
  readonly VITE_TURNSTILE_SITEKEY: string | undefined;
}

export function parsePublicEnv(raw: Record<string, unknown>): PublicEnv {
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_PUBLIC_KEY_PATTERN.test(key)) {
      throw new Error(
        `Non-public or secret-like environment variable "${key}" is not allowed in client code.`,
      );
    }

    if (!ALLOWED_ENV_KEYS.has(key)) {
      throw new Error(
        `Non-public or unknown environment variable "${key}" is not allowed in client code.`,
      );
    }
  }

  const apiBaseUrl = raw.VITE_API_BASE_URL;
  if (typeof apiBaseUrl !== 'string' || !apiBaseUrl.startsWith('https://')) {
    throw new Error('VITE_API_BASE_URL must be a valid HTTPS URL.');
  }
  try {
    new URL(apiBaseUrl);
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid HTTPS URL.');
  }
  const enabled = raw.VITE_TURNSTILE_ENABLED;
  if (enabled !== undefined && typeof enabled !== 'boolean' && typeof enabled !== 'string') {
    throw new Error('VITE_TURNSTILE_ENABLED must be a boolean or string.');
  }
  const siteKey = raw.VITE_TURNSTILE_SITEKEY;
  if (siteKey !== undefined && typeof siteKey !== 'string') {
    throw new Error('VITE_TURNSTILE_SITEKEY must be a string.');
  }
  return {
    VITE_API_BASE_URL: apiBaseUrl.replace(/\/+$/, ''),
    VITE_TURNSTILE_ENABLED: enabled === true || enabled === 'true',
    VITE_TURNSTILE_SITEKEY: siteKey?.trim() || undefined,
  };
}

let cachedEnv: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  const isTestMode = import.meta.env.MODE === 'test';

  if (cachedEnv && !isTestMode) {
    return cachedEnv;
  }

  const rawEnv: Record<string, unknown> = {
    MODE: import.meta.env.MODE,
    BASE_URL: import.meta.env.BASE_URL,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    SSR: import.meta.env.SSR,
    VITE_API_BASE_URL:
      import.meta.env.VITE_API_BASE_URL ?? (isTestMode ? TEST_DEFAULT_API_BASE_URL : undefined),
    VITE_TURNSTILE_ENABLED: import.meta.env.VITE_TURNSTILE_ENABLED,
    VITE_TURNSTILE_SITEKEY: import.meta.env.VITE_TURNSTILE_SITEKEY,
  };

  for (const key of Object.keys(import.meta.env)) {
    if (key.startsWith('VITE_') && !(key in rawEnv)) {
      rawEnv[key] = import.meta.env[key];
    }
  }

  const parsed = parsePublicEnv(rawEnv);

  if (!isTestMode) {
    cachedEnv = parsed;
  }

  return parsed;
}
