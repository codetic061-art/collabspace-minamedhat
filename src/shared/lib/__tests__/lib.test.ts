import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  broadcastSessionEvent,
  clearAuthToken,
  getAuthToken,
  hasAnyCapability,
  hasCapability,
  hasRememberedToken,
  hasStoredToken,
  isSafeExternalUrl,
  normalizeSystemRole,
  notifyUnauthorized,
  registerUnauthorizedHandler,
  resetUnauthorizedGuard,
  resolveSafeApiDownloadUrl,
  sanitizeReturnPath,
  setAuthToken,
  subscribeSessionEvents,
  toSafeExternalUrl,
} from '@/shared/lib';

describe('safeUrl helpers', () => {
  it('allows https external URLs and optional mailto, while rejecting unsafe schemes', () => {
    expect(toSafeExternalUrl('https://meet.example.test/room-12')).toBe(
      'https://meet.example.test/room-12',
    );
    expect(isSafeExternalUrl('https://collabspace.huma-volve.com/avatar.png')).toBe(true);
    expect(isSafeExternalUrl('http://insecure.example.test')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeExternalUrl('//evil.example.test/phish')).toBe(false);
    expect(isSafeExternalUrl('mailto:user@example.test')).toBe(false);
    expect(isSafeExternalUrl('mailto:user@example.test', { allowMailto: true })).toBe(true);
    expect(toSafeExternalUrl('https://evil.example.test/\nscript', { allowMailto: true })).toBe(
      null,
    );
  });

  it('resolves root-relative API download URLs and rejects unsafe origins', () => {
    const apiBase = 'https://collabspace.huma-volve.com/api/v1';

    expect(resolveSafeApiDownloadUrl('/api/v1/files/42/download', apiBase)).toBe(
      'https://collabspace.huma-volve.com/api/v1/files/42/download',
    );
    expect(
      resolveSafeApiDownloadUrl(
        'https://collabspace.huma-volve.com/api/v1/files/99/download',
        apiBase,
      ),
    ).toBe('https://collabspace.huma-volve.com/api/v1/files/99/download');

    const foreignUrl = 'https://evil.example.test/api/v1/files/1/download';
    expect(resolveSafeApiDownloadUrl(foreignUrl, apiBase)).toBe(null);
    expect(resolveSafeApiDownloadUrl('/api/v1/projects/1', apiBase)).toBe(null);
    expect(resolveSafeApiDownloadUrl('//evil.example.test/api/v1/files/1/download', apiBase)).toBe(
      null,
    );
  });
});

describe('sanitizeReturnPath', () => {
  it('keeps same-origin relative app paths and rejects open redirects and auth loops', () => {
    expect(sanitizeReturnPath('/projects/12?tab=tasks')).toBe('/projects/12?tab=tasks');
    expect(sanitizeReturnPath('/tasks?taskId=7#details')).toBe('/tasks?taskId=7#details');

    expect(sanitizeReturnPath('https://evil.example.test/steal')).toBe('/');
    expect(sanitizeReturnPath('//evil.example.test/steal')).toBe('/');
    expect(sanitizeReturnPath('/\\evil.example.test')).toBe('/');
    expect(sanitizeReturnPath('javascript:alert(1)')).toBe('/');
    expect(sanitizeReturnPath('/sign-in?redirectTo=/projects')).toBe('/');
    expect(sanitizeReturnPath('/forgot-password')).toBe('/');
    expect(sanitizeReturnPath('/verify-code')).toBe('/');
    expect(sanitizeReturnPath('/reset-password')).toBe('/');
    expect(sanitizeReturnPath(null, '/projects')).toBe('/projects');
  });
});

describe('capabilities map (ID-2, D2, D6)', () => {
  it('gates UI capabilities accurately for Administrator, Project Manager, and Team Member', () => {
    expect(normalizeSystemRole(['Project Manager'])).toBe('Project Manager');
    expect(normalizeSystemRole(['UnknownRole'])).toBeNull();
    expect(normalizeSystemRole([])).toBeNull();

    expect(hasCapability('Administrator', 'create_project')).toBe(true);
    expect(hasCapability('Project Manager', 'edit_project')).toBe(true);
    expect(hasCapability('Project Manager', 'delete_task')).toBe(true);

    // Team Member matrix reflects unverified UI assumptions per D6.
    expect(hasCapability('Team Member', 'create_project')).toBe(false);
    expect(hasCapability('Team Member', 'delete_task')).toBe(false);
    expect(hasCapability('Team Member', 'change_task_status')).toBe(true);
    expect(hasAnyCapability('Team Member', ['edit_task', 'change_task_status'])).toBe(true);
    expect(hasCapability(null, 'view_dashboard')).toBe(false);
  });
});

describe('session storage, BroadcastChannel, and 401 loop guard', () => {
  beforeEach(() => {
    clearAuthToken();
    resetUnauthorizedGuard();
    registerUnauthorizedHandler(null);
  });

  it('stores token in sessionStorage by default and switches cleanly for remember=true', () => {
    expect(hasStoredToken()).toBe(false);

    setAuthToken('fake-session-token');
    expect(getAuthToken()).toBe('fake-session-token');
    expect(window.sessionStorage.getItem('collabspace.auth.token')).toBe('fake-session-token');
    expect(window.localStorage.getItem('collabspace.auth.token')).toBeNull();
    expect(hasRememberedToken()).toBe(false);

    setAuthToken('fake-remembered-token', { remember: true });
    expect(getAuthToken()).toBe('fake-remembered-token');
    expect(window.localStorage.getItem('collabspace.auth.token')).toBe('fake-remembered-token');
    expect(window.sessionStorage.getItem('collabspace.auth.token')).toBeNull();
    expect(hasRememberedToken()).toBe(true);

    clearAuthToken();
    expect(getAuthToken()).toBeNull();
    expect(window.localStorage.getItem('collabspace.auth.token')).toBeNull();
    expect(window.sessionStorage.getItem('collabspace.auth.token')).toBeNull();
  });

  it('collapses concurrent 401 notifications until reset', () => {
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);

    expect(notifyUnauthorized()).toBe(true);
    expect(notifyUnauthorized()).toBe(false);
    expect(notifyUnauthorized()).toBe(false);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    resetUnauthorizedGuard();
    expect(notifyUnauthorized()).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it('broadcasts signed-in and signed-out events without transmitting tokens', () => {
    const events: Array<{ type: string }> = [];
    const unsubscribe = subscribeSessionEvents((event) => {
      events.push(event);
    });

    broadcastSessionEvent('signed-in');
    broadcastSessionEvent('signed-out');
    unsubscribe();

    expect(events).toEqual([{ type: 'signed-in' }, { type: 'signed-out' }]);
  });
});
