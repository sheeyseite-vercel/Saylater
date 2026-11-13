import { z } from "zod";

// Shared by client and server (no server-only imports).
export const COLLECTIONS = ["tasks", "ideas", "lists", "notes", "reminders", "events"] as const;
export type CollectionName = (typeof COLLECTIONS)[number];
export const isCollection = (v: string): v is CollectionName => (COLLECTIONS as readonly string[]).includes(v);

const iso = z.string().datetime({ offset: true });
const title = z.string().trim().min(1).max(200);
const description = z.string().max(20_000);

export const createSchemas = {
  tasks: z.object({
    title,
    description: description.max(2000).default(""),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    status: z.enum(["pending", "completed"]).default("pending"),
    dueDate: iso.nullable().default(null),
  }),
  ideas: z.object({
    title,
    description: description.max(2000).default(""),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    favorite: z.boolean().default(false),
  }),
  lists: z.object({
    title,
    kind: z.enum(["shopping", "general"]).default("general"),
    items: z.array(z.object({ text: z.string().trim().min(1).max(200), done: z.boolean().default(false) })).max(200).default([]),
  }),
  notes: z.object({ title, description: description.default("") }),
  reminders: z.object({
    title,
    description: description.max(2000).default(""),
    remindAt: iso,
    status: z.enum(["scheduled", "sent", "dismissed"]).default("scheduled"),
  }),
  events: z.object({
    title,
    description: description.max(2000).default(""),
    startsAt: iso,
    endsAt: iso.nullable().default(null),
  }),
} as const;

/** Patch = any subset of the create fields (defaults are NOT applied, so untouched fields stay untouched). */
export const patchSchemas = {
  tasks: createSchemas.tasks.partial().strict(),
  ideas: createSchemas.ideas.partial().strict(),
  lists: createSchemas.lists.partial().strict(),
  notes: createSchemas.notes.partial().strict(),
  reminders: createSchemas.reminders.partial().strict(),
  events: createSchemas.events.partial().strict(),
} as const;

/** Fields stored as Firestore Timestamps, exposed to the client as ISO strings. */
export const DATE_FIELDS: Record<CollectionName, readonly string[]> = {
  tasks: ["dueDate"],
  ideas: [],
  lists: [],
  notes: [],
  reminders: ["remindAt"],
  events: ["startsAt", "endsAt"],
};

export interface TaskItem { id: string; title: string; description: string; priority: "low" | "medium" | "high"; status: "pending" | "completed"; dueDate: string | null; createdAt: string; sourceRecordingId: string | null }
export interface IdeaItem { id: string; title: string; description: string; tags: string[]; favorite: boolean; createdAt: string; sourceRecordingId: string | null }
export interface ListItem { id: string; title: string; kind: "shopping" | "general"; items: { text: string; done: boolean }[]; description?: string; createdAt: string; sourceRecordingId: string | null }
export interface NoteItem { id: string; title: string; description: string; kind?: string; createdAt: string; sourceRecordingId: string | null }
export interface ReminderItem { id: string; title: string; description: string; remindAt: string; status: "scheduled" | "sent" | "dismissed"; createdAt: string; sourceRecordingId: string | null }
export interface EventItem { id: string; title: string; description: string; startsAt: string; endsAt: string | null; createdAt: string; sourceRecordingId: string | null }
