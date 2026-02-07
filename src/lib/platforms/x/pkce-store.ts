/**
 * In-memory PKCE state store for OAuth 2.0 flows.
 * Safe for single-user local app — transient OAuth state only.
 */

interface PkceEntry {
  codeVerifier: string;
  extended: boolean; // whether extended (Basic+ tier) scopes were requested
  createdAt: number; // unix ms
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const store = new Map<string, PkceEntry>();

/** Save a PKCE code verifier keyed by OAuth state parameter. */
export function savePkceState(state: string, codeVerifier: string, extended = false): void {
  cleanExpiredStates();
  store.set(state, { codeVerifier, extended, createdAt: Date.now() });
}

/** Retrieve and consume a PKCE entry. Returns null if expired or missing. */
export function getPkceState(state: string): { codeVerifier: string; extended: boolean } | null {
  cleanExpiredStates();
  const entry = store.get(state);
  if (!entry) return null;
  store.delete(state); // single-use
  return { codeVerifier: entry.codeVerifier, extended: entry.extended };
}

/** Remove entries older than TTL. */
function cleanExpiredStates(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > TTL_MS) {
      store.delete(key);
    }
  }
}
