export interface SafeExternalUrlOptions {
  allowMailto?: boolean;
}

function hasUnsafeWhitespaceOrControl(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/** Validates an external or user-provided URL against strict `https:` (or optional `mailto:`). */
export function toSafeExternalUrl(
  rawUrl: string | null | undefined,
  options: SafeExternalUrlOptions = {},
): string | null {
  if (!rawUrl) {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length === 0 || hasUnsafeWhitespaceOrControl(trimmed) || trimmed.startsWith('//')) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol === 'https:') {
    if (!parsed.hostname) {
      return null;
    }
    return parsed.toString();
  }

  if (options.allowMailto && parsed.protocol === 'mailto:') {
    if (!parsed.pathname || parsed.pathname.includes('?')) {
      return null;
    }
    return parsed.toString();
  }

  return null;
}

/** Predicate wrapper around `toSafeExternalUrl`. */
export function isSafeExternalUrl(
  rawUrl: string | null | undefined,
  options: SafeExternalUrlOptions = {},
): boolean {
  return toSafeExternalUrl(rawUrl, options) !== null;
}

/**
 * Resolves a verified API file download URL (`#dashboard-index` root-relative `/api/v1/files/{id}/download`
 * or `FileAttachmentResource.url` absolute URL) while rejecting foreign origins and non-file paths.
 */
export function resolveSafeApiDownloadUrl(
  pathOrUrl: string | null | undefined,
  apiBaseUrl: string,
): string | null {
  if (!pathOrUrl) {
    return null;
  }

  const trimmed = pathOrUrl.trim();
  if (trimmed.length === 0 || hasUnsafeWhitespaceOrControl(trimmed) || trimmed.startsWith('//')) {
    return null;
  }

  let base: URL;
  try {
    base = new URL(apiBaseUrl);
  } catch {
    return null;
  }

  if (base.protocol !== 'https:') {
    return null;
  }

  const basePath = base.pathname.replace(/\/+$/, '');
  const expectedFilesPrefix = `${basePath}/files/`;

  let resolved: URL;
  try {
    if (trimmed.startsWith('/')) {
      resolved = new URL(trimmed, base.origin);
    } else if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
      resolved = new URL(trimmed);
    } else {
      const normalizedRel = trimmed.replace(/^\/+/, '');
      resolved = new URL(`${basePath}/${normalizedRel}`, base.origin);
    }
  } catch {
    return null;
  }

  if (resolved.protocol !== 'https:' || resolved.origin !== base.origin) {
    return null;
  }

  if (
    !resolved.pathname.startsWith(expectedFilesPrefix) ||
    resolved.pathname === expectedFilesPrefix
  ) {
    return null;
  }

  return resolved.toString();
}
