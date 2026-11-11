import { ProviderError } from "../transcription/types";

export interface Attempt<T> {
  providerId: string;
  run: () => Promise<T>;
}

export interface FallbackOutcome<T> {
  value: T;
  providerId: string;
  /** Providers tried before the one that succeeded, with why they failed. */
  failedOver: { providerId: string; kind: string }[];
}

const MAX_RETRIES_PER_PROVIDER = 2;
const BASE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Controlled retry + failover.
 * - Transient errors (rate_limit, unavailable): bounded exponential backoff, then move
 *   to the next *user-authorized* provider in `attempts`.
 * - auth / billing / quota / invalid_input: stop immediately and surface the error.
 *   We never fail over silently on these, since that would mask a misconfiguration
 *   or send data to a provider the user did not choose for a billing problem.
 */
export async function runWithFallback<T>(attempts: Attempt<T>[]): Promise<FallbackOutcome<T>> {
  if (attempts.length === 0) {
    throw new ProviderError("auth", "No configured provider is available", "none");
  }
  const failedOver: FallbackOutcome<T>["failedOver"] = [];
  let lastError: unknown;

  for (const attempt of attempts) {
    for (let i = 0; i <= MAX_RETRIES_PER_PROVIDER; i++) {
      try {
        return { value: await attempt.run(), providerId: attempt.providerId, failedOver };
      } catch (e) {
        lastError = e;
        if (!(e instanceof ProviderError) || !e.retryable) throw e;
        if (i < MAX_RETRIES_PER_PROVIDER) await sleep(BASE_DELAY_MS * 2 ** i);
      }
    }
    failedOver.push({
      providerId: attempt.providerId,
      kind: lastError instanceof ProviderError ? lastError.kind : "unknown",
    });
  }
  throw lastError;
}
