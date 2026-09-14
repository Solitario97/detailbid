// ---------------------------------------------------------------------------
// Persistent (localStorage) pointer to the client's current active request.
//
// Root cause of the "loses the request after closing the tab" bug: the app
// already wrote to localStorage (not sessionStorage — that part of the
// original bug report was a wrong guess), but it wrote to a *per-request*
// key (`autopick:request:${publicId}`) and NEVER read it back anywhere in
// the codebase. To look that key up you must already know `publicId` — but
// the one place that would need to look it up (the homepage, on a fresh
// visit with no URL) has no way to know it. The token/publicId pair only
// ever reached the request page via the URL's `?t=` query string, which is
// gone the moment the tab is closed and the site is reopened without that
// URL. Refresh (F5) "worked" only because the URL itself doesn't change.
//
// Fix: one well-known, single key holding just {publicId, token} — nothing
// else (no offers, price, status, company data). That pair *is* this app's
// existing guest-access mechanism (`Request.accessTokenHash`, verified by
// `getRequestByPublicIdAndToken`), so persisting it is exactly as secure as
// the URL already was, not a new/weaker mechanism.
// ---------------------------------------------------------------------------

const ACTIVE_REQUEST_STORAGE_KEY = "autopick_active_request";

export interface StoredActiveRequest {
  publicId: string;
  token: string;
}

function isStoredActiveRequest(value: unknown): value is StoredActiveRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).publicId === "string" &&
    typeof (value as Record<string, unknown>).token === "string" &&
    (value as StoredActiveRequest).publicId.length > 0 &&
    (value as StoredActiveRequest).token.length > 0
  );
}

/** Persists the minimal pointer needed to restore this request later. Never stores the request/offers themselves — those always come fresh from the backend. */
export function saveActiveRequest(publicId: string, token: string): void {
  if (typeof window === "undefined") return; // SSR guard — never touch storage on the server
  try {
    const value: StoredActiveRequest = { publicId, token };
    window.localStorage.setItem(ACTIVE_REQUEST_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota, disabled) — the current tab
    // still works via the URL's own ?t= token; restoring in a future tab
    // just won't be possible for this visitor.
  }
}

/** Parses a raw localStorage string (see readActiveRequestRaw) into a validated pointer, or null. */
export function parseStoredActiveRequest(raw: string | null): StoredActiveRequest | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredActiveRequest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Reads the persisted pointer, if any and well-formed. Client-side only. */
export function readActiveRequest(): StoredActiveRequest | null {
  return parseStoredActiveRequest(readActiveRequestRaw());
}

/**
 * Raw (unparsed) read of the storage slot. Exists so `useSyncExternalStore`
 * (see home-gate.tsx) can be given a snapshot getter that returns a plain
 * string — stable under `Object.is` when nothing changed — rather than a
 * freshly-parsed object every call, which would look like a change on every
 * render and violate useSyncExternalStore's "cached snapshot" contract.
 */
export function readActiveRequestRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_REQUEST_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Always returns null — the SSR snapshot for useSyncExternalStore (there is no localStorage on the server). */
export function readActiveRequestServerSnapshot(): string | null {
  return null;
}

/**
 * Notifies `callback` when the pointer changes in ANOTHER tab/window of the
 * same origin (the native `storage` event never fires for the tab that made
 * the change itself). This is what makes an already-open homepage tab
 * notice "oh, a request was just created in another tab" without the user
 * needing to reload it.
 */
export function subscribeToActiveRequestChanges(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === ACTIVE_REQUEST_STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Clears the pointer — call once the request is confirmed gone/terminal/invalid. */
export function clearActiveRequest(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_REQUEST_STORAGE_KEY);
  } catch {
    // ignore
  }
}
