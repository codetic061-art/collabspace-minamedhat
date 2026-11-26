import { z } from 'zod';

const TEST_DEFAULT_API_BASE_URL = 'https://collabspace.huma-volve.com/api/v1';

const ALLOWED_ENV_KEYS = new Set([
  'VITE_API_BASE_URL',
  'VITE_TURNSTILE_ENABLED',
  'VITE_TURNSTILE_SITEKEY',
  'MODE',
  'BASE_URL',
  'PROD',
  'DEV',
  'SSR',
]);

const publicEnvSchema = z.object({
  VITE_API_BASE_URL: z
    .url('VITE_API_BASE_URL must be a valid URL.')
    .refine(
      (value) => value.startsWith('https://'),
      'VITE_API_BASE_URL must use the https:// scheme.',
    )
    .transform((value) => value.replace(/\/+$/, '')),
  VITE_TURNSTILE_ENABLED: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === 'true'),
  VITE_TURNSTILE_SITEKEY: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }),
});

export interface PublicEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_TURNSTILE_ENABLED: boolean;
  readonly VITE_TURNSTILE_SITEKEY: string | undefined;
}

export function parsePublicEnv(raw: Record<string, unknown>): PublicEnv {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_ENV_KEYS.has(key)) {
      throw new Error(
        `Non-public or unknown environment variable "${key}" is not allowed in client code.`,
      );
    }
  }

  return publicEnvSchema.parse(raw);
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
