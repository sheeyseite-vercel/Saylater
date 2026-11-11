import { z } from "zod";

export const itemTypes = [
  "task",
  "idea",
  "note",
  "shopping_list",
  "reminder",
  "event",
  "meeting_summary",
  "important_information",
  "personal_thought",
] as const;

// Dates must be ISO 8601 or null. The model is told never to guess; anything it
// resolved from a relative phrase is flagged so the UI can ask for confirmation.
const isoOrNull = z.string().datetime({ offset: true }).nullable();

const base = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  // true when the model inferred rather than quoted; shown as "uncertain" in review
  inferred: z.boolean().default(false),
  evidence: z.string().max(500).nullable().default(null), // verbatim transcript excerpt
});

export const analysisItemSchema = z.discriminatedUnion("type", [
  base.extend({
    type: z.literal("task"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    dueDate: isoOrNull.default(null),
    dueDateNeedsConfirmation: z.boolean().default(false),
    requiresConfirmation: z.boolean().default(true),
  }),
  base.extend({ type: z.literal("idea"), tags: z.array(z.string()).default([]) }),
  base.extend({ type: z.literal("note") }),
  base.extend({
    type: z.literal("shopping_list"),
    items: z.array(z.string().min(1)).min(1),
  }),
  base.extend({
    type: z.literal("reminder"),
    remindAt: isoOrNull.default(null),
    needsConfirmation: z.literal(true).default(true),
  }),
  base.extend({
    type: z.literal("event"),
    startsAt: isoOrNull.default(null),
    endsAt: isoOrNull.default(null),
    needsConfirmation: z.literal(true).default(true),
  }),
  base.extend({ type: z.literal("meeting_summary") }),
  base.extend({ type: z.literal("important_information") }),
  base.extend({ type: z.literal("personal_thought") }),
]);

export const analysisResultSchema = z.object({
  language: z.string().min(2).max(10),
  summary: z.string().max(4000),
  items: z.array(analysisItemSchema).max(100),
  clarifications: z.array(z.string()).default([]), // questions for the user when essential info is missing
});

export type AnalysisItem = z.infer<typeof analysisItemSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
