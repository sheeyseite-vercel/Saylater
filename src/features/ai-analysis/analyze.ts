import "server-only";
import { ZodError } from "zod";
import { runWithFallback } from "@/lib/ai/orchestration/run-with-fallback";
import { aiProviders } from "@/lib/ai/registry";
import { ProviderError } from "@/lib/ai/transcription/types";
import type { AnalysisResult } from "@/lib/ai/schemas/analysis";
import { ANALYSIS_JSON_SCHEMA, normalizeAnalysis } from "./normalize";
import { ANALYSIS_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export const MAX_ANALYSIS_CHARS = 60_000;

export interface AnalyzeInput {
  transcript: string;
  recordedAt: Date;
  timezone: string;
}

export async function analyzeTranscript(
  input: AnalyzeInput,
): Promise<{ result: AnalysisResult; providerId: string; model: string }> {
  if (input.transcript.length > MAX_ANALYSIS_CHARS) {
    throw new ProviderError("invalid_input", "Transcript too long", "none");
  }

  const attempts = aiProviders().map((p) => ({
    providerId: p.id,
    run: async () => {
      let repairHint: string | undefined;
      // One repair retry: models occasionally violate the schema even in strict mode.
      for (let i = 0; i < 2; i++) {
        const out = await p.generateJson({
          system: ANALYSIS_SYSTEM_PROMPT,
          user: buildUserPrompt({ ...input, repairHint }),
          jsonSchema: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
        });
        try {
          return { result: normalizeAnalysis(out.json, input.transcript), model: out.model };
        } catch (e) {
          if (!(e instanceof ZodError)) throw e;
          repairHint = e.issues
            .slice(0, 3)
            .map((x) => `${x.path.join(".") || "root"}: ${x.message}`)
            .join("; ");
        }
      }
      throw new ProviderError("invalid_input", "Model output failed validation", p.id);
    },
  }));

  const outcome = await runWithFallback(attempts);
  return { result: outcome.value.result, providerId: outcome.providerId, model: outcome.value.model };
}
