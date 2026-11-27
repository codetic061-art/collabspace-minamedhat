export type SessionBroadcastEventType = 'signed-in' | 'signed-out';

export interface SessionBroadcastEvent {
  type: SessionBroadcastEventType;
}

export interface SetAuthTokenOptions {
  remember?: boolean;
}

const SESSION_STORAGE_KEY = 'collabspace.auth.token';
const BROADCAST_CHANNEL_NAME = 'collabspace-session';

let memoryToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let unauthorizedGuardTriggered = false;

function readStorage(storage: Storage | undefined): string | null {
  if (!storage) {
    return null;
  }
  try {
    const value = storage.getItem(SESSION_STORAGE_KEY);
    return value && value.trim().length > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | undefined, value: string): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(SESSION_STORAGE_KEY, value);
  } catch {
    // Ignore storage quota/privacy-mode errors; memory fallback remains active.
  }
}

function removeStorage(storage: Storage | undefined): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage access errors when clearing.
  }
}

function getSessionStorageSafe(): Storage | undefined {
  return typeof window !== 'undefined' ? window.sessionStorage : undefined;
}

function getLocalStorageSafe(): Storage | undefined {
  return typeof window !== 'undefined' ? window.localStorage : undefined;
}

/**
 * Returns the active Sanctum Bearer token from memory, `sessionStorage`, or `localStorage`.
 * This module is the sole owner of token storage (ADR-01).
 */
export function getAuthToken(): string | null {
  if (memoryToken) {
    return memoryToken;
  }

  const fromSession = readStorage(getSessionStorageSafe());
  if (fromSession) {
    memoryToken = fromSession;
    return fromSession;
  }

  const fromLocal = readStorage(getLocalStorageSafe());
  if (fromLocal) {
    memoryToken = fromLocal;
    return fromLocal;
  }

  return null;
}

/** Indicates whether a token currently exists in memory or Web Storage. */
export function hasStoredToken(): boolean {
  return getAuthToken() !== null;
}

/** Indicates whether a "Remember Me" token is persisted in `localStorage` for cross-tab sync. */
export function hasRememberedToken(): boolean {
  return readStorage(getLocalStorageSafe()) !== null;
}

/** Persists the Sanctum token in memory plus `sessionStorage` (default) or `localStorage` (`remember`). */
export function setAuthToken(token: string, options: SetAuthTokenOptions = {}): void {
  const normalized = token.trim();
  if (!normalized) {
    clearAuthToken();
    return;
  }

  memoryToken = normalized;
  unauthorizedGuardTriggered = false;

  const sessionStore = getSessionStorageSafe();
  const localStore = getLocalStorageSafe();

  if (options.remember) {
    removeStorage(sessionStore);
    writeStorage(localStore, normalized);
  } else {
    removeStorage(localStore);
    writeStorage(sessionStore, normalized);
  }
}

/** Clears the Sanctum token from memory, `sessionStorage`, and `localStorage`. */
export function clearAuthToken(): void {
  memoryToken = null;
  removeStorage(getSessionStorageSafe());
  removeStorage(getLocalStorageSafe());
}

/** Registers the single app-level handler invoked when an authenticated request fails with HTTP 401. */
export function registerUnauthorizedHandler(handler: (() => void) | null): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

/** Resets the concurrent-401 loop guard (for example after sign-in completes). */
export function resetUnauthorizedGuard(): void {
  unauthorizedGuardTriggered = false;
}

/**
 * Invokes the centralized 401 handler at most once per active session loss (ID-19, ADR-01).
 * Returns `true` if this call triggered the handler, or `false` if collapsed by the loop guard.
 */
export function notifyUnauthorized(): boolean {
  if (unauthorizedGuardTriggered) {
    return false;
  }
  unauthorizedGuardTriggered = true;
  unauthorizedHandler?.();
  return true;
}

function createBroadcastChannelSafe(): BroadcastChannel | null {
  if (typeof globalThis.BroadcastChannel !== 'function') {
    return null;
  }
  try {
    return new globalThis.BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    return null;
  }
}

/** Broadcasts `{ type: 'signed-in' | 'signed-out' }` across same-origin tabs (never includes tokens). */
export function broadcastSessionEvent(type: SessionBroadcastEventType): void {
  const channel = createBroadcastChannelSafe();
  if (!channel) {
    return;
  }

  try {
    const payload: SessionBroadcastEvent = { type };
    channel.postMessage(payload);
  } finally {
    channel.close();
  }
}

/** Subscribes to cross-tab session events (`signed-in` / `signed-out`) and returns an unsubscribe fn. */
export function subscribeSessionEvents(
  listener: (event: SessionBroadcastEvent) => void,
): () => void {
  const channel = createBroadcastChannelSafe();
  if (!channel) {
    return () => {};
  }

  const handleMessage = (message: MessageEvent<unknown>) => {
    const data = message.data;
    if (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      (data.type === 'signed-in' || data.type === 'signed-out')
    ) {
      listener({ type: data.type });
    }
  };

  channel.addEventListener('message', handleMessage);
  return () => {
    channel.removeEventListener('message', handleMessage);
    channel.close();
  };
}
