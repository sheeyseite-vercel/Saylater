import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { get } from "@vercel/blob";
import { adminDb } from "@/lib/firebase/admin";
import { runWithFallback } from "@/lib/ai/orchestration/run-with-fallback";
import { speechProviders } from "@/lib/ai/registry";
import { ProviderError } from "@/lib/ai/transcription/types";
import { analyzeTranscript } from "@/features/ai-analysis/analyze";
import { normalizeMime } from "./audio-formats";
import { recordingsCol } from "./server";

/** A run that has not touched the document for this long is considered dead and may be re-claimed. */
const LEASE_MS = 4 * 60 * 1000;
const RUNNING = ["transcription_queued", "transcribing", "analysis_queued", "analyzing"];

export type ClaimResult =
  | { claimed: true; stage: "transcribe" | "analyze" }
  | { claimed: false; reason: "running" | "ready" | "not_found" };

/**
 * Atomically claims a recording for processing, so double-clicks, retries and two tabs
 * can never run the same job twice (and never create duplicate transcripts or analyses).
 */
export async function claimProcessing(
  uid: string,
  id: string,
  opts: { force: boolean },
): Promise<ClaimResult> {
  const ref = recordingsCol(uid).doc(id);
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data();
    if (!d) return { claimed: false, reason: "not_found" } as const;

    const status = String(d.processingStatus ?? "uploaded");
    const updated = d.updatedAt instanceof Timestamp ? d.updatedAt.toMillis() : 0;
    if (RUNNING.includes(status) && Date.now() - updated < LEASE_MS) {
      return { claimed: false, reason: "running" } as const;
    }
    if ((status === "awaiting_review" || status === "completed") && !opts.force) {
      return { claimed: false, reason: "ready" } as const;
    }
    if (!d.audioPath && !d.transcript) return { claimed: false, reason: "not_found" } as const;

    const hasTranscript = typeof d.transcript === "string" && d.transcript.length > 0;
    const stage = hasTranscript ? "analyze" : "transcribe";
    tx.update(ref, {
      processingStatus: stage === "analyze" ? "analysis_queued" : "transcription_queued",
      processingError: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { claimed: true, stage } as const;
  });
}

const fail = (uid: string, id: string, code: string) =>
  recordingsCol(uid)
    .doc(id)
    .update({ processingStatus: "failed", processingError: code, updatedAt: FieldValue.serverTimestamp() })
    .catch(() => undefined);

const LANG_NAMES: Record<string, string> = { arabic: "ar", french: "fr", english: "en" };
/** Whisper may report "arabic" or "ar"; keep only codes we support, otherwise leave it unknown. */
function languageCode(v: string | null): string | null {
  if (!v) return null;
  const x = v.toLowerCase();
  return LANG_NAMES[x] ?? (["ar", "fr", "en"].includes(x) ? x : null);
}

export function errorCode(e: unknown): string {
  if (e instanceof ProviderError) return e.kind; // auth | billing | quota | rate_limit | unavailable | invalid_input | unknown
  return "unknown";
}

/** Runs after the response has been sent. Every exit path leaves the document in a final state. */
export async function runProcessing(
  uid: string,
  id: string,
  opts: { timezone: string; stage: "transcribe" | "analyze" },
): Promise<void> {
  const ref = recordingsCol(uid).doc(id);
  try {
    let snap = await ref.get();
    let d = snap.data();
    if (!d) return;

    if (opts.stage === "transcribe") {
      await ref.update({ processingStatus: "transcribing", updatedAt: FieldValue.serverTimestamp() });

      const path = typeof d.audioPath === "string" ? d.audioPath : null;
      if (!path) return void (await fail(uid, id, "audio_missing"));
      const blob = await get(path, { access: "private" });
      if (!blob || blob.statusCode !== 200 || !blob.stream) return void (await fail(uid, id, "audio_missing"));
      const audio = new Uint8Array(await new Response(blob.stream).arrayBuffer());
      const mimeType = normalizeMime(blob.blob.contentType || String(d.audioFormat || ""));
      const hint = typeof d.language === "string" ? d.language : undefined;

      const providers = speechProviders();
      const { value, providerId } = await runWithFallback(
        providers.map((p) => ({
          providerId: p.id,
          run: () => p.transcribe({ audio, mimeType, languageHint: hint }),
        })),
      );

      const text = value.text.trim();
      if (text.replace(/[\s\p{P}]/gu, "").length < 2) return void (await fail(uid, id, "no_speech"));

      await ref.update({
        transcript: text, // verbatim provider output, kept as the original
        language: hint ?? languageCode(value.detectedLanguage),
        transcriptionProvider: providerId,
        processingStatus: "transcribed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      snap = await ref.get();
      d = snap.data() ?? d;
    }

    await ref.update({ processingStatus: "analyzing", updatedAt: FieldValue.serverTimestamp() });
    const transcript = String((typeof d.editedTranscript === "string" && d.editedTranscript.trim()) || d.transcript || "");
    const created = d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date();
    const { result, providerId } = await analyzeTranscript({
      transcript,
      recordedAt: created,
      timezone: opts.timezone,
    });

    await ref.update({
      analysis: result,
      analysisRunId: crypto.randomUUID(), // scopes created records to this analysis run
      summary: result.summary,
      analysisProvider: providerId,
      processingStatus: "awaiting_review", // nothing becomes a task/reminder until the user confirms
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("processing failed", e instanceof ProviderError ? `${e.providerId}:${e.kind}` : "unknown");
    await fail(uid, id, errorCode(e));
  }
}
