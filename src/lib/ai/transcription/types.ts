export interface TranscribeInput {
  audio: Uint8Array;
  mimeType: string;
  /** BCP-47 / ISO-639-1 hint. Omit to let the provider auto-detect. */
  languageHint?: string;
  signal?: AbortSignal;
}

export interface TranscribeResult {
  text: string; // verbatim provider output; stored as the original transcript
  detectedLanguage: string | null;
  durationSeconds: number | null;
  providerId: string;
  model: string;
}

export type ProviderErrorKind =
  | "auth" // bad/missing key: never retried, never silently failed over
  | "billing"
  | "quota" // exhausted: never retried, never silently failed over
  | "rate_limit" // transient
  | "unavailable" // transient
  | "invalid_input"
  | "unknown";

export class ProviderError extends Error {
  constructor(
    public kind: ProviderErrorKind,
    message: string,
    public providerId: string,
  ) {
    super(message);
  }
  get retryable() {
    return this.kind === "rate_limit" || this.kind === "unavailable";
  }
}

export interface SpeechToTextProvider {
  readonly id: string;
  readonly displayName: string;
  readonly supportedMimeTypes: readonly string[];
  readonly maxFileBytes: number;
  isConfigured(): boolean;
  transcribe(input: TranscribeInput): Promise<TranscribeResult>;
  testConnection(): Promise<{ ok: boolean; detail?: string }>;
}
