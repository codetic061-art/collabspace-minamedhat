import { getPublicEnv } from '@/shared/config';
import { getAuthToken, notifyUnauthorized, resolveSafeApiDownloadUrl } from '@/shared/lib';
import { ApiRequestError, parseRetryAfterHeader, type AppError } from './errors';

const DEFAULT_TIMEOUT_MS = 15_000;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryParamValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, QueryParamValue>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuth?: boolean;
  skipUnauthorizedHandler?: boolean;
}

export interface ApiMessageResult {
  message: string;
}

export interface ApiSuccessEnvelope<TData> {
  success: true;
  message?: string;
  data: TData;
}

export interface ApiEnvelopeWithMeta<TData, TMeta> {
  success: true;
  message?: string;
  data: TData;
  meta: TMeta;
}

export interface DownloadBlobOptions {
  fallbackFilename: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface DownloadedFileResult {
  blob: Blob;
  filename: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildRequestUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryParamValue>,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function extractStringMessage(payload: unknown): string {
  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }
  return '';
}

function extractValidationErrors(payload: unknown): Record<string, string[]> {
  if (!isRecord(payload) || !isRecord(payload.errors)) {
    return {};
  }

  const normalized: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(payload.errors)) {
    if (Array.isArray(messages)) {
      const stringMessages = messages.filter((item): item is string => typeof item === 'string');
      if (stringMessages.length > 0) {
        normalized[field] = stringMessages;
      }
    }
  }

  return normalized;
}

function normalizeHttpError(
  status: number,
  payload: unknown,
  headers: Headers,
  skipUnauthorizedHandler: boolean,
): AppError {
  const message = extractStringMessage(payload);

  switch (status) {
    case 400:
      return { kind: 'bad_request', status: 400, message };
    case 401:
      if (!skipUnauthorizedHandler) {
        notifyUnauthorized();
      }
      return { kind: 'unauthorized', status: 401, message: message || undefined };
    case 403:
      return {
        kind: 'forbidden',
        status: 403,
        message: message || 'This action is unauthorized.',
      };
    case 404:
      return { kind: 'not_found', status: 404 };
    case 409:
      return { kind: 'conflict', status: 409, message };
    case 422:
      return {
        kind: 'validation',
        status: 422,
        message: message || 'Validation failed.',
        errors: extractValidationErrors(payload),
      };
    case 429: {
      const retryAfterSeconds = parseRetryAfterHeader(headers.get('Retry-After'));
      const rateLimitError: AppError = {
        kind: 'rate_limited',
        status: 429,
        message: message || 'Too many attempts. Please wait and try again.',
      };
      if (retryAfterSeconds !== undefined) {
        rateLimitError.retryAfterSeconds = retryAfterSeconds;
      }
      return rateLimitError;
    }
    case 405:
      return {
        kind: 'unexpected',
        status: 405,
        detail: message || 'Method not allowed.',
      };
    default:
      if (status >= 500) {
        return { kind: 'server', status };
      }
      return {
        kind: 'unexpected',
        status,
        detail: message || `Unexpected HTTP status ${status}.`,
      };
  }
}

async function parseJsonSafe(response: Response): Promise<{ ok: boolean; data: unknown }> {
  try {
    const data: unknown = await response.json();
    return { ok: true, data };
  } catch {
    return { ok: false, data: null };
  }
}

async function executeFetch(
  url: string,
  init: RequestInit,
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<Response> {
  if (callerSignal?.aborted) {
    throw new ApiRequestError({ kind: 'aborted' });
  }

  const controller = new AbortController();
  let didCallerAbort = false;
  let didTimeout = false;

  const handleCallerAbort = () => {
    didCallerAbort = true;
    controller.abort();
  };

  if (callerSignal) {
    callerSignal.addEventListener('abort', handleCallerAbort, { once: true });
  }

  const timeoutHandle = globalThis.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    if (didCallerAbort || callerSignal?.aborted) {
      throw new ApiRequestError({ kind: 'aborted' });
    }
    if (didTimeout || (error instanceof DOMException && error.name === 'TimeoutError')) {
      throw new ApiRequestError({ kind: 'timeout' });
    }
    throw new ApiRequestError({ kind: 'network' });
  } finally {
    globalThis.clearTimeout(timeoutHandle);
    if (callerSignal) {
      callerSignal.removeEventListener('abort', handleCallerAbort);
    }
  }
}

function buildJsonInit(options: RequestOptions): RequestInit {
  const headers = new Headers();
  headers.set('Accept', 'application/json');

  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  return {
    method: options.method ?? 'GET',
    headers,
    body,
  };
}

/**
 * Sends a JSON or multipart API request and returns the verified envelope object
 * (for E1/E2/E4/P4 endpoints that carry `meta` or `message` alongside `data`).
 */
export async function requestEnvelope<TEnvelope extends object = Record<string, unknown>>(
  path: string,
  options: RequestOptions = {},
): Promise<TEnvelope> {
  const { VITE_API_BASE_URL } = getPublicEnv();
  const url = buildRequestUrl(VITE_API_BASE_URL, path, options.query);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const response = await executeFetch(url, buildJsonInit(options), options.signal, timeoutMs);
  const parsed = await parseJsonSafe(response);

  if (!response.ok) {
    throw new ApiRequestError(
      normalizeHttpError(
        response.status,
        parsed.data,
        response.headers,
        Boolean(options.skipUnauthorizedHandler),
      ),
    );
  }

  if (!parsed.ok || !isRecord(parsed.data) || parsed.data.success !== true) {
    throw new ApiRequestError({
      kind: 'unexpected',
      status: response.status,
      detail: 'Response payload did not match the expected API envelope.',
    });
  }

  return parsed.data as TEnvelope; // Verified `isRecord` and `success === true` above.
}

/** Sends a request expecting `{ success: true, message?, data: T }` (`E1` or `E2`) and unwraps `data`. */
export async function requestJson<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  const envelope = await requestEnvelope<{ success: true; message?: string; data: TData }>(
    path,
    options,
  );
  if (!('data' in envelope)) {
    throw new ApiRequestError({
      kind: 'unexpected',
      detail: 'Expected "data" field in API response envelope.',
    });
  }
  return envelope.data;
}

/** Sends a request expecting `E3` (`data: null`) or `E4` (`{ success: true, message }`). */
export async function requestAction(
  path: string,
  options: RequestOptions = {},
): Promise<ApiMessageResult> {
  const envelope = await requestEnvelope<{ success: true; message?: unknown }>(path, options);
  return {
    message: typeof envelope.message === 'string' ? envelope.message : '',
  };
}

function parseContentDispositionFilename(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }
  const match = /filename\*?=(?:UTF-8''|"?)([^";\n]+)"?/i.exec(headerValue);
  const rawName = match?.[1]?.trim();
  if (!rawName) {
    return null;
  }
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

/**
 * Downloads an authenticated binary file (`#files-download`, `#dashboard-index`) as a `Blob`.
 * Enforces API-origin/path validation and Bearer auth without leaking tokens into URLs (ADR-05).
 */
export async function downloadBlob(
  pathOrUrl: string,
  options: DownloadBlobOptions,
): Promise<DownloadedFileResult> {
  const { VITE_API_BASE_URL } = getPublicEnv();
  const safeUrl = resolveSafeApiDownloadUrl(pathOrUrl, VITE_API_BASE_URL);
  if (!safeUrl) {
    throw new ApiRequestError({
      kind: 'unexpected',
      detail: 'Blocked untrusted or invalid file download URL.',
    });
  }

  const headers = new Headers();
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await executeFetch(
    safeUrl,
    { method: 'GET', headers },
    options.signal,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  if (!response.ok) {
    const parsed = await parseJsonSafe(response);
    throw new ApiRequestError(
      normalizeHttpError(response.status, parsed.data, response.headers, false),
    );
  }

  const blob = await response.blob();
  const headerName = parseContentDispositionFilename(response.headers.get('Content-Disposition'));

  return {
    blob,
    filename: options.fallbackFilename || headerName || 'download',
  };
}

/** Saves an already-fetched `Blob` to disk and immediately revokes its temporary object URL (ADR-05). */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }
}
