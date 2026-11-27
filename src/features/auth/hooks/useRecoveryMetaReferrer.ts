import { useEffect } from 'react';

/** Enforces `<meta name="referrer" content="no-referrer">` while password recovery routes mount (ADR-12). */
export function useRecoveryMetaReferrer(): void {
  useEffect(() => {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="referrer"]');
    const created = !existing;
    const metaEl = existing ?? document.createElement('meta');
    const previousContent = existing?.getAttribute('content') ?? null;

    metaEl.setAttribute('name', 'referrer');
    metaEl.setAttribute('content', 'no-referrer');
    if (created) {
      document.head.appendChild(metaEl);
    }

    return () => {
      if (created) {
        metaEl.remove();
      } else if (previousContent !== null) {
        metaEl.setAttribute('content', previousContent);
      } else {
        metaEl.removeAttribute('content');
      }
    };
  }, []);
}
