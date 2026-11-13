import { errorResponse, requireSession } from "@/lib/api";
import { adminDb } from "@/lib/firebase/admin";
import { foldText } from "@/features/ai-analysis/normalize";

export const runtime = "nodejs";

type Kind = "recording" | "task" | "idea" | "list" | "note" | "reminder" | "event";
interface Result { kind: Kind; id: string; title: string; snippet: string; href: string }

const SOURCES: { kind: Kind; col: string; fields: string[]; href: (id: string) => string; limit: number }[] = [
  { kind: "recording", col: "recordings", fields: ["title", "summary", "editedTranscript", "transcript"], href: (id) => `/recordings/${id}`, limit: 200 },
  { kind: "task", col: "tasks", fields: ["title", "description"], href: () => "/tasks", limit: 300 },
  { kind: "idea", col: "ideas", fields: ["title", "description", "tags"], href: () => "/ideas", limit: 300 },
  { kind: "list", col: "lists", fields: ["title", "items"], href: () => "/lists", limit: 200 },
  { kind: "note", col: "notes", fields: ["title", "description"], href: () => "/notes", limit: 300 },
  { kind: "reminder", col: "reminders", fields: ["title", "description"], href: () => "/calendar", limit: 200 },
  { kind: "event", col: "events", fields: ["title", "description"], href: () => "/calendar", limit: 200 },
];

const textOf = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : textOf((x as { text?: unknown })?.text))).join(" ");
  return "";
};

function snippet(text: string, tokens: string[]): string {
  const lower = text.toLowerCase();
  const at = tokens.map((t) => lower.indexOf(t)).find((i) => i >= 0) ?? 0;
  const start = Math.max(0, at - 40);
  return (start > 0 ? "…" : "") + text.slice(start, start + 160).replace(/\s+/g, " ").trim();
}

/**
 * Search over the caller's own data. Firestore has no full-text search, so recent documents are
 * loaded (bounded per collection) and matched in memory with Arabic/French-aware normalisation.
 * Every token must appear somewhere in the item.
 */
export async function GET(req: Request) {
  try {
    const user = await requireSession({ strict: false });
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
    if (q.length < 2) return Response.json({ results: [] });
    const tokens = foldText(q).split(" ").filter(Boolean);
    if (tokens.length === 0) return Response.json({ results: [] });
    const rawTokens = q.toLowerCase().split(/\s+/).filter(Boolean);

    const perSource = await Promise.all(
      SOURCES.map(async (s) => {
        const snaps = await adminDb().collection(`users/${user.uid}/${s.col}`).orderBy("createdAt", "desc").limit(s.limit).get();
        const out: Result[] = [];
        for (const doc of snaps.docs) {
          const d = doc.data();
          const parts = s.fields.map((f) => ({ f, text: textOf(d[f]) }));
          const hay = foldText(parts.map((p) => p.text).join(" "));
          if (!tokens.every((t) => hay.includes(t))) continue;
          const body = parts.find((p) => p.f !== "title" && p.text && foldText(p.text).includes(tokens[0] as string)) ?? parts.find((p) => p.f !== "title" && p.text);
          out.push({
            kind: s.kind,
            id: doc.id,
            title: textOf(d.title) || "—",
            snippet: body ? snippet(body.text, rawTokens) : "",
            href: s.href(doc.id),
          });
        }
        return out;
      }),
    );
    return Response.json({ results: perSource.flat().slice(0, 60) });
  } catch (e) {
    return errorResponse(e);
  }
}
