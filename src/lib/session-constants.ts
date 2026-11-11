// Shared by the Edge middleware and server code, so it must not import server-only modules.
export const SESSION_COOKIE = "saylater_session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
/** A fresh ID token is required to mint a session; older ones are rejected. */
export const MAX_AUTH_AGE_SECONDS = 5 * 60;
