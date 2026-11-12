import { z } from "zod";
import { analysisResultSchema, type AnalysisResult } from "@/lib/ai/schemas/analysis";

/**
 * JSON Schema sent to the model. Deliberately flat (one object shape for every item type,
 * every field required, nullable when not applicable): strict structured-output modes handle
 * this far more reliably than unions. `normalizeAnalysis` turns it into the strict
 * discriminated union and validates it with Zod.
 */
const nullableString = { type: ["string", "null"] };
export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["language", "summary", "items", "clarifications"],
  properties: {
    language: { type: "string", description: "ISO 639-1 code of the transcript language" },
    summary: { type: "string" },
    clarifications: { type: "array", items: { type: "string" } },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type", "title", "description", "inferred", "evidence", "priority",
          "dueDate", "remindAt", "startsAt", "endsAt", "tags", "listItems",
        ],
        properties: {
          type: {
            type: "string",
            enum: [
              "task", "idea", "note", "shopping_list", "reminder", "event",
              "meeting_summary", "important_information", "personal_thought",
            ],
          },
          title: { type: "string" },
          description: { type: "string" },
          inferred: { type: "boolean" },
          evidence: nullableString,
          priority: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
          dueDate: nullableString,
          remindAt: nullableString,
          startsAt: nullableString,
          endsAt: nullableString,
          tags: { type: "array", items: { type: "string" } },
          listItems: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

const rawItem = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string().default(""),
  inferred: z.boolean().default(false),
  evidence: z.string().nullable().default(null),
  priority: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  remindAt: z.string().nullable().default(null),
  startsAt: z.string().nullable().default(null),
  endsAt: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  listItems: z.array(z.string()).default([]),
});

const rawResult = z.object({
  language: z.string(),
  summary: z.string(),
  items: z.array(rawItem),
  clarifications: z.array(z.string()).default([]),
});

/** Lowercase, strip diacritics/tatweel/punctuation, collapse whitespace. Works for Arabic, French, English. */
export function foldText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{M}ـ]/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const dateSchema = z.string().datetime({ offset: true });
const validDate = (v: string | null): string | null =>
  v && dateSchema.safeParse(v).success ? v : null;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

/**
 * Validates and sanitises raw model output.
 * - An "evidence" quote that does not actually appear in the transcript is dropped and the item
 *   is flagged as inferred, so the UI never presents an invented quote as the user's words.
 * - Any resolved date requires user confirmation.
 * - Malformed dates become null rather than guesses.
 */
export function normalizeAnalysis(raw: unknown, transcript: string): AnalysisResult {
  const parsed = rawResult.parse(raw);
  const haystack = foldText(transcript);

  const items = parsed.items.slice(0, 100).map((it) => {
    let inferred = it.inferred;
    let evidence: string | null = it.evidence ? clip(it.evidence.trim(), 500) : null;
    if (evidence) {
      const folded = foldText(evidence);
      if (!folded || !haystack.includes(folded)) {
        evidence = null;
        inferred = true;
      }
    } else {
      inferred = true;
    }

    const common = {
      title: clip(it.title.trim() || "—", 200),
      description: clip(it.description.trim(), 2000),
      inferred,
      evidence,
    };

    switch (it.type) {
      case "task": {
        const dueDate = validDate(it.dueDate);
        return {
          ...common,
          type: "task" as const,
          priority: it.priority === "low" || it.priority === "high" ? it.priority : ("medium" as const),
          dueDate,
          dueDateNeedsConfirmation: dueDate !== null,
          requiresConfirmation: true,
        };
      }
      case "idea":
        return { ...common, type: "idea" as const, tags: it.tags.slice(0, 10).map((t) => clip(t.trim(), 40)).filter(Boolean) };
      case "shopping_list": {
        const listItems = it.listItems.map((i) => i.trim()).filter(Boolean);
        // A list with nothing in it is just a note.
        return listItems.length
          ? { ...common, type: "shopping_list" as const, items: listItems }
          : { ...common, type: "note" as const };
      }
      case "reminder":
        return { ...common, type: "reminder" as const, remindAt: validDate(it.remindAt), needsConfirmation: true as const };
      case "event":
        return {
          ...common,
          type: "event" as const,
          startsAt: validDate(it.startsAt),
          endsAt: validDate(it.endsAt),
          needsConfirmation: true as const,
        };
      case "meeting_summary":
      case "important_information":
      case "personal_thought":
      case "note":
        return { ...common, type: it.type };
      default:
        return { ...common, type: "note" as const }; // unknown type: keep the content, never drop it
    }
  });

  return analysisResultSchema.parse({
    language: clip(parsed.language.trim() || "und", 10),
    summary: clip(parsed.summary.trim(), 4000),
    items,
    clarifications: parsed.clarifications.map((c) => clip(c.trim(), 300)).filter(Boolean).slice(0, 10),
  });
}
