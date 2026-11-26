const RELOAD_ATTEMPT_KEY = 'collabspace.preload_reload_attempted';

/** Detects Vite dynamic-import / chunk-load errors across browsers. */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('chunkloaderror')
  );
}

/**
 * Handles `vite:preloadError` (stale chunk after Vercel redeploy, Spec ID-18):
 * triggers at most one automatic reload per browser session so users never loop infinitely.
 */
export function registerPreloadErrorHandler(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onPreloadError = (event: Event) => {
    try {
      const alreadyAttempted = window.sessionStorage.getItem(RELOAD_ATTEMPT_KEY) === '1';
      if (!alreadyAttempted) {
        window.sessionStorage.setItem(RELOAD_ATTEMPT_KEY, '1');
        window.location.reload();
        return;
      }
      event.preventDefault();
    } catch {
      event.preventDefault();
    }
  };

  window.addEventListener('vite:preloadError', onPreloadError);
  return () => {
    window.removeEventListener('vite:preloadError', onPreloadError);
  };
}
