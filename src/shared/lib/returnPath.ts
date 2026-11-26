const AUTH_ROUTE_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/verify-code',
  '/reset-password',
] as const;

const DUMMY_ORIGIN = 'https://collabspace.local';

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Accepts only same-origin relative paths beginning with a single `/` and excludes
 * protocol-relative URLs, foreign origins, backslashes, control characters, and public auth routes.
 */
export function sanitizeReturnPath(rawPath: string | null | undefined, fallback = '/'): string {
  const safeFallback = fallback.startsWith('/') && !fallback.startsWith('//') ? fallback : '/';
  if (!rawPath) {
    return safeFallback;
  }

  const trimmed = rawPath.trim();
  if (
    trimmed.length === 0 ||
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    hasControlChars(trimmed)
  ) {
    return safeFallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, DUMMY_ORIGIN);
  } catch {
    return safeFallback;
  }

  if (parsed.origin !== DUMMY_ORIGIN) {
    return safeFallback;
  }

  if (isAuthRoute(parsed.pathname)) {
    return safeFallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
