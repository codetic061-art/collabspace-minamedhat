/** Discriminated application error union matching Spec ID-19 and ADR-05 (all 12 kinds). */
export type AppError =
  | { kind: 'network' }
  | { kind: 'timeout' }
  | { kind: 'aborted' }
  | { kind: 'bad_request'; status: 400; message: string }
  | { kind: 'unauthorized'; status: 401; message?: string }
  | { kind: 'forbidden'; status: 403; message: string }
  | { kind: 'not_found'; status: 404 }
  | { kind: 'conflict'; status: 409; message: string }
  | { kind: 'validation'; status: 422; message: string; errors: Record<string, string[]> }
  | { kind: 'rate_limited'; status: 429; message: string; retryAfterSeconds?: number }
  | { kind: 'server'; status: number }
  | { kind: 'unexpected'; status?: number; detail: string };

/** Error subclass thrown by `httpClient` so React Error Boundaries and TanStack Query inspect `appError`. */
export class ApiRequestError extends Error {
  readonly appError: AppError;

  constructor(appError: AppError) {
    super(getErrorMessage(appError));
    this.name = 'ApiRequestError';
    this.appError = appError;
  }
}

/** Parses an HTTP `Retry-After` header (integer delta seconds or HTTP-date) when exposed. */
export function parseRetryAfterHeader(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
  }

  const targetMs = Date.parse(trimmed);
  if (Number.isNaN(targetMs)) {
    return undefined;
  }

  const diffSeconds = Math.ceil((targetMs - Date.now()) / 1000);
  return diffSeconds > 0 ? diffSeconds : 0;
}

/** Checks whether an arbitrary caught value is an `ApiRequestError`. */
export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

/** Normalizes any caught value into an `AppError` (never exposing raw server internals on 5xx/404). */
export function toAppError(error: unknown): AppError {
  if (error instanceof ApiRequestError) {
    return error.appError;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string'
  ) {
    switch (error.kind) {
      case 'network':
      case 'timeout':
      case 'aborted':
      case 'bad_request':
      case 'unauthorized':
      case 'forbidden':
      case 'not_found':
      case 'conflict':
      case 'validation':
      case 'rate_limited':
      case 'server':
      case 'unexpected':
        return error as AppError; // Verified discriminant against all 12 AppError kinds.
      default:
        break;
    }
  }
  return {
    kind: 'unexpected',
    detail: error instanceof Error ? error.message : 'Unexpected failure',
  };
}

/** Maps any `AppError` into a safe, user-facing message per ID-19 (sanitizing 404/5xx details). */
export function getErrorMessage(error: AppError): string {
  switch (error.kind) {
    case 'network':
    case 'timeout':
      return 'Connection problem. Check your connection and try again.';
    case 'aborted':
      return '';
    case 'bad_request':
      return error.message || 'The request could not be processed.';
    case 'unauthorized':
      return error.message || 'Please sign in to continue.';
    case 'forbidden':
      return error.message || "You don't have permission to do this.";
    case 'not_found':
      return 'The requested resource could not be found.';
    case 'conflict':
      return error.message || 'This action conflicts with the current state.';
    case 'validation':
      return error.message || 'Please check the highlighted fields.';
    case 'rate_limited':
      return 'Too many attempts. Please wait and try again.';
    case 'server':
      return 'Something went wrong on our side. Please try again.';
    case 'unexpected':
      return 'Something unexpected went wrong. Please try again.';
  }
}
