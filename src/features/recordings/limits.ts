// Defaults for the free plan. Enforced server-side (token issuance + metadata creation);
// the client mirrors them only to give early, friendly errors.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_DURATION_SECONDS = 10 * 60;
export const FREE_MAX_RECORDINGS = 50;
