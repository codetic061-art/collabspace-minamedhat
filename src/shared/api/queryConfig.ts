import { QueryClient } from '@tanstack/react-query';
import { toAppError } from './errors';

const MAX_READ_RETRIES = 2;
const MAX_BACKOFF_MS = 8_000;

/**
 * Bounded GET retry predicate per ADR-05 and Spec ID-19:
 * retries at most 2 times only for `network`, `timeout`, or `server` (5xx) errors.
 * Never retries 4xx (`400`, `401`, `403`, `404`, `409`, `422`, `429`), `aborted`, or `unexpected`.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_READ_RETRIES) {
    return false;
  }

  const appError = toAppError(error);
  return appError.kind === 'network' || appError.kind === 'timeout' || appError.kind === 'server';
}

/** Exponential backoff capped at 8s (`1s -> 2s -> 4s -> 8s`). */
export function getRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, MAX_BACKOFF_MS);
}

/** Creates a configured TanStack `QueryClient` with bounded read retries and 0 mutation retries. */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: shouldRetryQuery,
        retryDelay: getRetryDelay,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
