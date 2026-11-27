import { describe, expect, it } from 'vitest';
import { parsePublicEnv } from '@/shared/config';
import { zodSecurityConfig } from '@/shared/config/zod';

describe('parsePublicEnv', () => {
  it('enables Zod jitless mode so strict CSP without unsafe-eval never fails', () => {
    expect(zodSecurityConfig.jitless).toBe(true);
  });
  it('accepts a valid HTTPS VITE_API_BASE_URL and defaults Turnstile to false', () => {
    const env = parsePublicEnv({
      VITE_API_BASE_URL: 'https://collabspace.huma-volve.com/api/v1',
    });

    expect(env.VITE_API_BASE_URL).toBe('https://collabspace.huma-volve.com/api/v1');
    expect(env.VITE_TURNSTILE_ENABLED).toBe(false);
  });

  it('rejects a missing or non-HTTPS VITE_API_BASE_URL', () => {
    expect(() => parsePublicEnv({})).toThrow();
    expect(() =>
      parsePublicEnv({
        VITE_API_BASE_URL: 'http://collabspace.huma-volve.com/api/v1',
      }),
    ).toThrow();
  });

  it('rejects any non-public, unknown, or secret-like environment variable', () => {
    expect(() =>
      parsePublicEnv({
        VITE_API_BASE_URL: 'https://collabspace.huma-volve.com/api/v1',
        SECRET_TOKEN: 'leaked',
      }),
    ).toThrow(/Non-public/i);

    expect(() =>
      parsePublicEnv({
        VITE_API_BASE_URL: 'https://collabspace.huma-volve.com/api/v1',
        VITE_VERCEL_OIDC_TOKEN: 'leaked',
      }),
    ).toThrow(/Non-public/i);

    expect(() =>
      parsePublicEnv({
        VITE_API_BASE_URL: 'https://collabspace.huma-volve.com/api/v1',
        VITE_UNKNOWN_FLAG: '1',
      }),
    ).toThrow(/Non-public/i);
  });

  it('permits Vercel public system metadata keys without exposing them in PublicEnv', () => {
    const env = parsePublicEnv({
      VITE_API_BASE_URL: 'https://collabspace.huma-volve.com/api/v1',
      VITE_VERCEL_ENV: 'preview',
      VITE_VERCEL_BRANCH_URL: 'example-git-feat-branch.vercel.app',
      VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG: '{}',
    });

    expect(env).toEqual({
      VITE_API_BASE_URL: 'https://collabspace.huma-volve.com/api/v1',
      VITE_TURNSTILE_ENABLED: false,
      VITE_TURNSTILE_SITEKEY: undefined,
    });
  });
});
