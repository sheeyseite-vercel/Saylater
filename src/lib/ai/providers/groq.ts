import "server-only";
import { ProviderError } from "../transcription/types";
import { kindFromStatus } from "../transcription/groq";
import type { AiProvider, GenerateJsonInput, GenerateJsonResult } from "./types";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const ID = "groq";
// Models that support strict json_schema output on Groq.
const MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] as const;
const DEFAULT_MODEL = process.env.GROQ_ANALYSIS_MODEL || MODELS[0];

export const groqAi: AiProvider = {
  id: ID,
  displayName: "Groq",
  models: MODELS,
  isConfigured: () => Boolean(process.env.GROQ_API_KEY),

  async generateJson(input: GenerateJsonInput): Promise<GenerateJsonResult> {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new ProviderError("auth", "GROQ_API_KEY is not set", ID);
    const model = input.model ?? DEFAULT_MODEL;

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "analysis", strict: true, schema: input.jsonSchema },
          },
        }),
        signal: input.signal ?? AbortSignal.timeout(90_000),
      });
    } catch {
      throw new ProviderError("unavailable", "Network error contacting Groq", ID);
    }
    if (!res.ok) throw new ProviderError(kindFromStatus(res.status), `Groq chat HTTP ${res.status}`, ID);

    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    } | null;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new ProviderError("unavailable", "Empty Groq response", ID);

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      // Strict mode should prevent this; if it happens the caller's repair retry handles it.
      throw new ProviderError("invalid_input", "Model returned invalid JSON", ID);
    }
    return {
      json,
      providerId: ID,
      model,
      usage: {
        inputTokens: data?.usage?.prompt_tokens ?? null,
        outputTokens: data?.usage?.completion_tokens ?? null,
      },
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
