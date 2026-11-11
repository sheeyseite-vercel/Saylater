import type { ProviderError } from "../transcription/types";

export type AiTask =
  | "classification"
  | "summarization"
  | "extraction"
  | "question_answering";

export interface GenerateJsonInput {
  system: string;
  user: string;
  /** JSON Schema describing the required response shape. */
  jsonSchema: Record<string, unknown>;
  model?: string;
  signal?: AbortSignal;
}

export interface GenerateJsonResult {
  /** Raw parsed JSON. Callers MUST validate it with Zod before use. */
  json: unknown;
  providerId: string;
  model: string;
  usage: { inputTokens: number | null; outputTokens: number | null };
}

export interface AiProvider {
  readonly id: string; // "gemini" | "openai" | "groq" | "anthropic"
  readonly displayName: string;
  readonly models: readonly string[];
  isConfigured(): boolean;
  generateJson(input: GenerateJsonInput): Promise<GenerateJsonResult>;
  testConnection(): Promise<{ ok: boolean; detail?: string }>;
}

export type { ProviderError };
