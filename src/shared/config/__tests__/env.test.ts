import { describe, expect, it } from 'vitest';
import { parsePublicEnv } from '@/shared/config';

describe('parsePublicEnv', () => {
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

  it('rejects any non-public or unknown environment variable', () => {
    expect(() =>
      parsePublicEnv({
        VITE_API_BASE_URL: 'https://collabspace.huma-volve.com/api/v1',
        SECRET_TOKEN: 'leaked',
      }),
    ).toThrow(/Non-public or unknown environment variable/i);
  });
});
