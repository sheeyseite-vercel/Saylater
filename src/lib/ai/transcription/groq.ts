import "server-only";
import {
  ProviderError,
  type ProviderErrorKind,
  type SpeechToTextProvider,
  type TranscribeInput,
  type TranscribeResult,
} from "./types";
import { isAllowedMime, extensionFor, normalizeMime } from "@/features/recordings/audio-formats";

const ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const ID = "groq";

// whisper-large-v3 is the most accurate (notably for Arabic); turbo is cheaper/faster.
const MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3";

/** Maps an HTTP status to our provider error kinds. Never includes response bodies (they may echo input). */
export function kindFromStatus(status: number): ProviderErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 402) return "billing";
  if (status === 429) return "rate_limit";
  if (status === 400 || status === 413 || status === 415 || status === 422) return "invalid_input";
  if (status >= 500) return "unavailable";
  return "unknown";
}

export const groqSpeechToText: SpeechToTextProvider = {
  id: ID,
  displayName: "Groq Whisper",
  supportedMimeTypes: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/flac", "video/webm"],
  maxFileBytes: 25 * 1024 * 1024,

  isConfigured: () => Boolean(process.env.GROQ_API_KEY),

  async transcribe(input: TranscribeInput): Promise<TranscribeResult> {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new ProviderError("auth", "GROQ_API_KEY is not set", ID);

    const mime = normalizeMime(input.mimeType);
    if (!isAllowedMime(mime)) throw new ProviderError("invalid_input", "Unsupported audio type", ID);
    if (input.audio.byteLength > this.maxFileBytes) throw new ProviderError("invalid_input", "File too large", ID);

    const form = new FormData();
    form.set("file", new Blob([input.audio as BlobPart], { type: mime }), `audio.${extensionFor(mime)}`);
    form.set("model", MODEL);
    form.set("response_format", "verbose_json");
    form.set("temperature", "0");
    if (input.languageHint) form.set("language", input.languageHint);

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: input.signal ?? AbortSignal.timeout(120_000),
      });
    } catch {
      throw new ProviderError("unavailable", "Network error contacting Groq", ID);
    }

    if (!res.ok) throw new ProviderError(kindFromStatus(res.status), `Groq STT HTTP ${res.status}`, ID);

    const data = (await res.json().catch(() => null)) as {
      text?: unknown;
      language?: unknown;
      duration?: unknown;
    } | null;
    if (!data || typeof data.text !== "string") {
      throw new ProviderError("unavailable", "Unexpected Groq STT response", ID);
    }
    return {
      text: data.text.trim(),
      // Not every response includes these; treat them as optional.
      detectedLanguage: typeof data.language === "string" ? data.language : null,
      durationSeconds: typeof data.duration === "number" ? data.duration : null,
      providerId: ID,
      model: MODEL,
    };
  },

  async testConnection() {
    const key = process.env.GROQ_API_KEY;
    if (!key) return { ok: false, detail: "not configured" };
    try {
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10_000),
      });
      return { ok: r.ok, detail: r.ok ? undefined : `HTTP ${r.status}` };
    } catch {
      return { ok: false, detail: "network error" };
    }
  },
};
