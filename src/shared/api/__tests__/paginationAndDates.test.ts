import { describe, expect, it, vi } from 'vitest';
import type { UseFormSetError } from 'react-hook-form';
import {
  ApiRequestError,
  applyServerValidationErrors,
  formatDisplayDate,
  formatDisplayTime,
  normalizeP1,
  normalizeP2,
  normalizeP3,
  normalizeP4,
  parseApiDate,
  parseApiTime,
  toApiDateString,
  toApiTimeString,
} from '@/shared/api';

describe('pagination normalizers (P1–P4)', () => {
  it('normalizes P1, P2, P3, and P4 including empty pages and unread_count', () => {
    const p1 = normalizeP1({
      data: [{ id: 1 }, { id: 2 }],
      links: { first: 'u', last: 'u', prev: null, next: 'u2' },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 4,
        links: [{ url: null, label: '&laquo; Previous', page: null, active: false }],
        path: 'https://collabspace.huma-volve.com/api/v1/projects',
        per_page: 2,
        to: 2,
        total: 8,
      },
    });
    expect(p1).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      currentPage: 1,
      lastPage: 4,
      perPage: 2,
      total: 8,
    });

    const p2Empty = normalizeP2({
      current_page: 1,
      data: [],
      first_page_url: 'u',
      from: null,
      last_page: 1,
      last_page_url: 'u',
      links: [],
      next_page_url: null,
      path: 'https://collabspace.huma-volve.com/api/v1/auth/profile/tasks',
      per_page: 15,
      prev_page_url: null,
      to: null,
      total: 0,
    });
    expect(p2Empty).toEqual({
      items: [],
      currentPage: 1,
      lastPage: 1,
      perPage: 15,
      total: 0,
    });

    const p3 = normalizeP3({
      items: [{ id: 10 }],
      pagination: { current_page: 2, per_page: 5, total: 12 },
    });
    expect(p3).toEqual({
      items: [{ id: 10 }],
      currentPage: 2,
      lastPage: 3,
      perPage: 5,
      total: 12,
    });

    const p4 = normalizeP4({
      data: [{ id: 5 }],
      meta: { current_page: 1, last_page: 2, per_page: 20, total: 25, unread_count: 3 },
    });
    expect(p4).toEqual({
      items: [{ id: 5 }],
      currentPage: 1,
      lastPage: 2,
      perPage: 20,
      total: 25,
      unreadCount: 3,
    });
  });
});

describe('date parser and serializer (all 4 verified formats)', () => {
  it('parses YYYY-MM-DD, HH:MM:SS, ISO+offset, and ISO-Z formats deterministically', () => {
    const calendar = parseApiDate('2026-11-26');
    expect(calendar?.toISOString()).toBe('2026-11-26T00:00:00.000Z');
    expect(formatDisplayDate('2026-11-26')).toBe('Nov 26, 2026');

    const isoOffset = parseApiDate('2026-11-26T14:30:00+02:00');
    expect(isoOffset?.toISOString()).toBe('2026-11-26T12:30:00.000Z');

    const isoZ = parseApiDate('2026-11-26T10:15:30.000000Z');
    expect(isoZ?.toISOString()).toBe('2026-11-26T10:15:30.000Z');
    expect(toApiDateString(isoZ)).toBe('2026-11-26');
    expect(toApiDateString('2026-11-26T22:00:00.000000Z')).toBe('2026-11-26');

    expect(parseApiTime('14:30:00')).toEqual({ hours: 14, minutes: 30, seconds: 0 });
    expect(formatDisplayTime('14:30:00')).toBe('2:30 PM');
    expect(toApiTimeString('09:05')).toBe('09:05:00');

    expect(parseApiDate('2026-02-31')).toBeNull();
    expect(parseApiTime('25:00:00')).toBeNull();
  });
});

describe('applyServerValidationErrors', () => {
  it('maps 422 fields with focus on first error and routes unknowns to root', () => {
    interface SampleValues {
      email: string;
      password: string;
    }

    // Mock typed to SampleValues RHF setter.
    const setError = vi.fn() as unknown as UseFormSetError<SampleValues>;
    const spy = vi.mocked(setError);

    const validationErr = new ApiRequestError({
      kind: 'validation',
      status: 422,
      message: 'Validation failed.',
      errors: {
        email: ['The email field must be a valid email address.'],
        password: ['The password field is required.'],
        otp: ['The code is invalid or has expired.'],
      },
    });

    applyServerValidationErrors(validationErr, setError, ['email', 'password']);

    expect(spy).toHaveBeenNthCalledWith(
      1,
      'email',
      { type: 'server', message: 'The email field must be a valid email address.' },
      { shouldFocus: true },
    );
    expect(spy).toHaveBeenNthCalledWith(
      2,
      'password',
      { type: 'server', message: 'The password field is required.' },
      { shouldFocus: false },
    );
    expect(spy).toHaveBeenNthCalledWith(3, 'root.serverError', {
      type: 'server',
      message: 'The code is invalid or has expired.',
    });

    spy.mockClear();
    applyServerValidationErrors(
      new ApiRequestError({
        kind: 'rate_limited',
        status: 429,
        message: 'Too many requests.',
      }),
      setError,
      ['email', 'password'],
    );
    expect(spy).toHaveBeenCalledWith('root.serverError', {
      type: 'server',
      message: 'Too many attempts. Please wait and try again.',
    });
  });
});
