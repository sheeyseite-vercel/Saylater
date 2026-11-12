import "server-only";
import type { SpeechToTextProvider } from "./transcription/types";
import type { AiProvider } from "./providers/types";
import { groqSpeechToText } from "./transcription/groq";
import { groqAi } from "./providers/groq";

// Order = failover order. Only providers with a configured key are used.
// Add Gemini/OpenAI/Anthropic here once their adapters exist.
export const speechProviders = (): SpeechToTextProvider[] =>
  [groqSpeechToText].filter((p) => p.isConfigured());

export const aiProviders = (): AiProvider[] => [groqAi].filter((p) => p.isConfigured());
