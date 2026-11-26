import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthToken,
  registerUnauthorizedHandler,
  resetUnauthorizedGuard,
  setAuthToken,
} from '@/shared/lib';
import {
  ApiRequestError,
  downloadBlob,
  getErrorMessage,
  requestAction,
  requestEnvelope,
  requestJson,
  shouldRetryQuery,
} from '@/shared/api';
import { mswServer } from '@/test/setup';

const BASE = 'https://collabspace.huma-volve.com/api/v1';

describe('httpClient normalization & envelopes (ID-19, ADR-05)', () => {
  beforeEach(() => {
    clearAuthToken();
    resetUnauthorizedGuard();
    registerUnauthorizedHandler(null);
  });

  it('sends Accept JSON and Bearer auth, leaving FormData Content-Type unset', async () => {
    setAuthToken('fake-bearer-123');
    let seenAccept: string | null = null;
    let seenAuth: string | null = null;
    let seenContentType: string | null = null;

    mswServer.use(
      http.post(`${BASE}/auth/profile`, ({ request }) => {
        seenAccept = request.headers.get('accept');
        seenAuth = request.headers.get('authorization');
        seenContentType = request.headers.get('content-type');
        return HttpResponse.json({
          success: true,
          message: 'Profile updated.',
          data: { id: 1 },
        });
      }),
    );

    const form = new FormData();
    form.append('job_title', 'Engineer');

    const result = await requestJson<{ id: number }>('/auth/profile', {
      method: 'POST',
      body: form,
    });

    expect(result).toEqual({ id: 1 });
    expect(seenAccept).toBe('application/json');
    expect(seenAuth).toBe('Bearer fake-bearer-123');
    expect(seenContentType).toContain('multipart/form-data');
  });

  it('supports E1-E4 envelopes and rejects non-envelope responses as unexpected', async () => {
    mswServer.use(
      http.get(`${BASE}/users`, () =>
        HttpResponse.json({
          success: true,
          data: [{ id: 10 }],
          meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
        }),
      ),
      http.post(`${BASE}/auth/logout`, () =>
        HttpResponse.json({
          success: true,
          message: 'Logged out successfully.',
          data: null,
        }),
      ),
      http.get(`${BASE}/broken`, () => HttpResponse.text('<html>bad</html>', { status: 200 })),
    );

    interface UsersEnv {
      success: true;
      data: Array<{ id: number }>;
      meta: { total: number };
      [key: string]: unknown;
    }

    const env = await requestEnvelope<UsersEnv>('/users');
    expect(env.meta.total).toBe(1);

    const logoutResult = await requestAction('/auth/logout', { method: 'POST' });
    expect(logoutResult.message).toBe('Logged out successfully.');

    await expect(requestJson('/broken')).rejects.toMatchObject({
      appError: { kind: 'unexpected', status: 200 },
    });
  });

  it('normalizes 400, 401, 403, 404, 405, 409, 422, 429, and 5xx HTTP errors', async () => {
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);

    mswServer.use(
      http.get(`${BASE}/e400`, () =>
        HttpResponse.json(
          { success: false, message: 'Bad parameters.', errors: null },
          { status: 400 },
        ),
      ),
      http.get(`${BASE}/e401`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Unauthenticated. Please provide a valid Bearer token.',
            errors: null,
          },
          { status: 401 },
        ),
      ),
      http.get(`${BASE}/e403`, () =>
        HttpResponse.json(
          { success: false, message: 'This action is unauthorized.', errors: null },
          { status: 403 },
        ),
      ),
      http.get(`${BASE}/e404`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'No query results for model [App\\Models\\Project] 999999',
            errors: null,
          },
          { status: 404 },
        ),
      ),
      http.get(`${BASE}/auth/login`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The GET method is not supported for route api/v1/auth/login.',
            errors: null,
          },
          { status: 405 },
        ),
      ),
      http.post(`${BASE}/e409`, () =>
        HttpResponse.json(
          { success: false, message: 'Already assigned.', errors: null },
          { status: 409 },
        ),
      ),
      http.post(`${BASE}/e422`, () =>
        HttpResponse.json(
          {
            message: 'Validation error.',
            errors: { 'members.0.role_in_team': ['Invalid team role.'] },
          },
          { status: 422 },
        ),
      ),
      http.post(`${BASE}/e429-header`, () =>
        HttpResponse.json(
          { success: false, message: 'Too Many Attempts.', errors: null },
          { status: 429, headers: { 'Retry-After': '45' } },
        ),
      ),
      http.post(`${BASE}/e429-no-header`, () =>
        HttpResponse.json(
          { success: false, message: 'Too Many Attempts.', errors: null },
          { status: 429 },
        ),
      ),
      http.get(`${BASE}/e500`, () =>
        HttpResponse.json(
          { success: false, message: 'SQLSTATE[42S02]: internal error', errors: null },
          { status: 500 },
        ),
      ),
    );

    await expect(requestJson('/e400')).rejects.toMatchObject({
      appError: { kind: 'bad_request', status: 400, message: 'Bad parameters.' },
    });

    // Concurrent 401s trigger unauthorized handler only once.
    const results401 = await Promise.allSettled([requestJson('/e401'), requestJson('/e401')]);
    expect(results401.every((r) => r.status === 'rejected')).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    // 403 preserves session and exposes message.
    setAuthToken('still-valid-token');
    await expect(requestJson('/e403')).rejects.toMatchObject({
      appError: { kind: 'forbidden', status: 403, message: 'This action is unauthorized.' },
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    // 404 never leaks PHP model class names.
    try {
      await requestJson('/e404');
      throw new Error('Expected 404');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      const apiErr = err as ApiRequestError; // Narrowed after toBeInstanceOf assertion.
      expect(apiErr.appError.kind).toBe('not_found');
      expect(getErrorMessage(apiErr.appError)).not.toContain('App\\Models\\Project');
    }

    await expect(requestJson('/auth/login')).rejects.toMatchObject({
      appError: { kind: 'unexpected', status: 405 },
    });
    await expect(requestJson('/e409', { method: 'POST', body: {} })).rejects.toMatchObject({
      appError: { kind: 'conflict', status: 409, message: 'Already assigned.' },
    });
    await expect(requestJson('/e422', { method: 'POST', body: {} })).rejects.toMatchObject({
      appError: {
        kind: 'validation',
        status: 422,
        errors: { 'members.0.role_in_team': ['Invalid team role.'] },
      },
    });
    await expect(requestJson('/e429-header', { method: 'POST', body: {} })).rejects.toMatchObject({
      appError: { kind: 'rate_limited', status: 429, retryAfterSeconds: 45 },
    });
    const res429NoHeader = requestJson('/e429-no-header', { method: 'POST', body: {} });
    await expect(res429NoHeader).rejects.toMatchObject({
      appError: { kind: 'rate_limited', status: 429 },
    });

    // 500 never exposes SQL/server error strings.
    try {
      await requestJson('/e500');
      throw new Error('Expected 500');
    } catch (err) {
      const apiErr = err as ApiRequestError; // Thrown directly from requestJson above.
      expect(apiErr.appError).toEqual({ kind: 'server', status: 500 });
      expect(getErrorMessage(apiErr.appError)).not.toContain('SQLSTATE');
    }
  });

  it('distinguishes network, timeout, aborted, and login 401 exclusion cleanly', async () => {
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);

    mswServer.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json(
          { success: false, message: 'Invalid credentials.', errors: null },
          { status: 401 },
        ),
      ),
      http.get(`${BASE}/net-err`, () => HttpResponse.error()),
      http.get(`${BASE}/slow`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    await expect(
      requestJson('/auth/login', {
        method: 'POST',
        body: { email: 'user@example.test', password: 'wrong' },
        skipAuth: true,
        skipUnauthorizedHandler: true,
      }),
    ).rejects.toMatchObject({ appError: { kind: 'unauthorized', status: 401 } });
    expect(onUnauthorized).not.toHaveBeenCalled();

    await expect(requestJson('/net-err')).rejects.toMatchObject({
      appError: { kind: 'network' },
    });

    await expect(requestJson('/slow', { timeoutMs: 25 })).rejects.toMatchObject({
      appError: { kind: 'timeout' },
    });

    const controller = new AbortController();
    controller.abort();
    await expect(requestJson('/slow', { signal: controller.signal })).rejects.toMatchObject({
      appError: { kind: 'aborted' },
    });
  });

  it('enforces downloadBlob origin checks, Bearer auth, and retry rules', async () => {
    setAuthToken('fake-dl-token');
    let authHeader: string | null = null;

    mswServer.use(
      http.get(`${BASE}/files/7/download`, ({ request }) => {
        authHeader = request.headers.get('authorization');
        return new HttpResponse('file-bytes', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }),
    );

    const downloaded = await downloadBlob('/api/v1/files/7/download', {
      fallbackFilename: 'notes.txt',
    });
    expect(downloaded.filename).toBe('notes.txt');
    expect(authHeader).toBe('Bearer fake-dl-token');

    await expect(
      downloadBlob('https://untrusted.example.test/api/v1/files/7/download', {
        fallbackFilename: 'notes.txt',
      }),
    ).rejects.toMatchObject({ appError: { kind: 'unexpected' } });

    expect(shouldRetryQuery(0, new ApiRequestError({ kind: 'network' }))).toBe(true);
    expect(shouldRetryQuery(1, new ApiRequestError({ kind: 'timeout' }))).toBe(true);
    expect(shouldRetryQuery(2, new ApiRequestError({ kind: 'server', status: 503 }))).toBe(false);
    const errForbidden = new ApiRequestError({ kind: 'forbidden', status: 403, message: 'No' });
    const errRate = new ApiRequestError({ kind: 'rate_limited', status: 429, message: 'Slow' });
    expect(shouldRetryQuery(0, errForbidden)).toBe(false);
    expect(shouldRetryQuery(0, errRate)).toBe(false);
  });
});
