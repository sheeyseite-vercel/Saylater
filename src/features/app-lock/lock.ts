// Client-only. The PIN never leaves the device: only a salted PBKDF2 hash is kept in localStorage.
// This is a privacy screen (protects against someone picking up your unlocked phone), not
// encryption of your data.

export const LOCK_COOKIE = "saylater_applock"; // "1" lets the server render the lock screen first (no content flash)
export const TIMEOUTS = [0, 60_000, 300_000, 900_000] as const;
export const PIN_MIN = 4;
export const PIN_MAX = 6;
const ITERATIONS = 150_000;
const MAX_FREE_ATTEMPTS = 5;

export interface LockConfig {
  v: 1;
  salt: string;
  hash: string;
  iterations: number;
  length: number;
  timeoutMs: number;
}

const cfgKey = (uid: string) => `saylater-lock:${uid}`;
const failKey = (uid: string) => `saylater-lock-fail:${uid}`;

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return b64(bits);
}

export const isValidPin = (pin: string) => new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin);

function setCookie(on: boolean) {
  document.cookie = `${LOCK_COOKIE}=${on ? "1" : ""}; path=/; max-age=${on ? 31536000 : 0}; samesite=lax`;
}

export function readLock(uid: string): LockConfig | null {
  try {
    const raw = localStorage.getItem(cfgKey(uid));
    if (!raw) return null;
    const c = JSON.parse(raw) as LockConfig;
    return c && c.v === 1 && typeof c.hash === "string" ? c : null;
  } catch {
    return null;
  }
}

function write(uid: string, c: LockConfig) {
  localStorage.setItem(cfgKey(uid), JSON.stringify(c));
}

export async function createLock(uid: string, pin: string, timeoutMs: number): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  write(uid, {
    v: 1,
    salt: b64(salt),
    hash: await derive(pin, salt, ITERATIONS),
    iterations: ITERATIONS,
    length: pin.length,
    timeoutMs,
  });
  localStorage.removeItem(failKey(uid));
  setCookie(true);
}

export function setTimeoutMs(uid: string, timeoutMs: number) {
  const c = readLock(uid);
  if (c) write(uid, { ...c, timeoutMs });
}

export function removeLock(uid: string) {
  try {
    localStorage.removeItem(cfgKey(uid));
    localStorage.removeItem(failKey(uid));
  } catch {
    /* ignore */
  }
  setCookie(false);
}

export function clearCookieOnly() {
  setCookie(false);
}

export type VerifyResult = { ok: true } | { ok: false; waitSeconds: number };

/** Checks a PIN with escalating delays after repeated failures (stored per device). */
export async function verifyPin(uid: string, pin: string): Promise<VerifyResult> {
  const c = readLock(uid);
  if (!c) return { ok: true };
  let fail = { count: 0, until: 0 };
  try {
    fail = JSON.parse(localStorage.getItem(failKey(uid)) ?? "") as typeof fail;
  } catch {
    /* none yet */
  }
  const now = Date.now();
  if (fail.until > now) return { ok: false, waitSeconds: Math.ceil((fail.until - now) / 1000) };

  const hash = await derive(pin, unb64(c.salt), c.iterations);
  if (hash === c.hash) {
    localStorage.removeItem(failKey(uid));
    return { ok: true };
  }
  const count = (fail.count || 0) + 1;
  const wait = count >= MAX_FREE_ATTEMPTS ? Math.min(30_000 * 2 ** (count - MAX_FREE_ATTEMPTS), 15 * 60_000) : 0;
  localStorage.setItem(failKey(uid), JSON.stringify({ count, until: wait ? now + wait : 0 }));
  return { ok: false, waitSeconds: Math.ceil(wait / 1000) };
}
