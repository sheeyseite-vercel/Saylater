"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revalidateRecordings } from "@/features/recordings/actions";
import type { AnalysisItem } from "@/lib/ai/schemas/analysis";
import type { Recording } from "@/types/domain";

const RUNNING = ["transcription_queued", "transcribing", "analysis_queued", "analyzing"];
const KNOWN_ERRORS = ["auth", "billing", "quota", "rate_limit", "unavailable", "invalid_input", "no_speech", "audio_missing"];

type Reviewed = { keep: boolean; item: AnalysisItem };

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const timezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

export function ProcessingPanel({ recording }: { recording: Recording }) {
  const t = useTranslations("processing");
  const router = useRouter();
  const [rec, setRec] = useState(recording);
  const [starting, setStarting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [reviewed, setReviewed] = useState<Reviewed[]>([]);

  const running = RUNNING.includes(rec.processingStatus);
  const shownTranscript = rec.editedTranscript ?? rec.transcript;

  const reload = useCallback(async () => {
    const res = await fetch(`/api/recordings/${recording.id}`).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { recording: Recording };
    setRec(data.recording);
  }, [recording.id]);

  // Poll while the server is working. The job runs server-side, so leaving the page is safe.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => void reload(), 2500);
    return () => clearInterval(id);
  }, [running, reload]);

  useEffect(() => {
    if (!running) void revalidateRecordings();
  }, [running]);

  // (Re)build the review list whenever a fresh analysis arrives.
  useEffect(() => {
    if (rec.processingStatus === "awaiting_review" && rec.analysis) {
      setReviewed(rec.analysis.items.map((item) => ({ keep: true, item })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.processingStatus, rec.updatedAt]);

  async function start(force: boolean) {
    setStarting(true);
    setMsg(null);
    const res = await fetch(`/api/recordings/${recording.id}/process`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timezone: timezone(), force }),
    }).catch(() => null);
    setStarting(false);
    if (!res || !(res.status === 200 || res.status === 202)) {
      return setMsg({ kind: "error", text: t(res?.status === 503 ? "errors.notConfigured" : "errors.startFailed") });
    }
    await reload();
  }

  async function saveTranscript(value: string | null) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/recordings/${recording.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ editedTranscript: value }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg({ kind: "error", text: t("transcriptSaveFailed") });
    setEditing(false);
    setMsg({ kind: "ok", text: t("transcriptSaved") });
    await reload();
  }

  function update(i: number, patch: Partial<Reviewed> | { item: Partial<AnalysisItem> }) {
    setReviewed((list) =>
      list.map((r, idx) => {
        if (idx !== i) return r;
        if ("item" in patch && patch.item) return { ...r, item: { ...r.item, ...patch.item } as AnalysisItem };
        return { ...r, ...(patch as Partial<Reviewed>) };
      }),
    );
  }

  const kept = reviewed.filter((r) => r.keep);
  const missingDate = kept.some(
    (r) => (r.item.type === "reminder" && !r.item.remindAt) || (r.item.type === "event" && !r.item.startsAt),
  );

  async function confirm() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/recordings/${recording.id}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: kept.map((r) => r.item) }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg({ kind: "error", text: t(res?.status === 409 ? "errors.alreadyConfirmed" : "errors.confirmFailed") });
    setMsg({ kind: "ok", text: t("confirmed", { count: kept.length }) });
    await reload();
    router.refresh();
  }

  const errCode = rec.processingError && KNOWN_ERRORS.includes(rec.processingError) ? rec.processingError : "unknown";

  return (
    <div className="space-y-6">
      {/* Transcript: the original is never overwritten; edits are stored separately. */}
      <section className="glass space-y-3 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t("transcript")}</h2>
          {rec.transcript && !editing && !running && (
            <Button
              variant="ghost"
              className="h-9 w-auto"
              onClick={() => {
                setDraft(shownTranscript);
                setEditing(true);
              }}
            >
              {t("edit")}
            </Button>
          )}
        </div>

        {running && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t(`running.${rec.processingStatus}`)}
          </p>
        )}

        {rec.processingStatus === "failed" && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p>{t(`errors.${errCode}`)}</p>
          </div>
        )}

        {!rec.transcript && !running && rec.audioPath && (
          <Button className="w-auto" disabled={starting} onClick={() => void start(false)}>
            <Sparkles className="me-2 h-4 w-4" aria-hidden="true" />
            {rec.processingStatus === "failed" ? t("retry") : t("start")}
          </Button>
        )}
        {!rec.transcript && !running && !rec.audioPath && (
          <p className="text-sm text-muted-foreground">{t("noAudio")}</p>
        )}

        {rec.transcript && !editing && (
          <>
            <p className="whitespace-pre-wrap leading-relaxed" dir="auto">{shownTranscript}</p>
            {rec.editedTranscript && (
              <p className="text-xs text-muted-foreground">
                {t("editedNote")}{" "}
                <button type="button" className="underline" disabled={busy} onClick={() => void saveTranscript(null)}>
                  {t("resetOriginal")}
                </button>
              </p>
            )}
          </>
        )}

        {editing && (
          <div className="space-y-2">
            <label htmlFor="transcript-edit" className="sr-only">{t("transcript")}</label>
            <textarea
              id="transcript-edit"
              dir="auto"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              maxLength={50000}
              className="w-full rounded-xl border border-border bg-card p-3 leading-relaxed"
            />
            <div className="flex gap-2">
              <Button className="w-auto" disabled={busy || !draft.trim()} onClick={() => void saveTranscript(draft)}>
                {t("saveEdit")}
              </Button>
              <Button variant="ghost" className="w-auto" disabled={busy} onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {rec.transcript && !running && !editing && (
          <Button variant="ghost" className="h-9 w-auto" disabled={starting} onClick={() => void start(true)}>
            {t("reanalyze")}
          </Button>
        )}
      </section>

      {rec.summary && (
        <section className="glass space-y-2 rounded-2xl p-6">
          <h2 className="font-semibold">{t("summary")}</h2>
          <p className="whitespace-pre-wrap leading-relaxed" dir="auto">{rec.summary}</p>
        </section>
      )}

      {rec.processingStatus === "awaiting_review" && rec.analysis && (
        <section className="glass space-y-4 rounded-2xl p-6">
          <div>
            <h2 className="font-semibold">{t("reviewTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("reviewHint")}</p>
          </div>

          {rec.analysis.clarifications.length > 0 && (
            <div className="rounded-xl border border-border p-3 text-sm">
              <p className="mb-1 font-medium">{t("clarifications")}</p>
              <ul className="list-disc space-y-1 ps-5">
                {rec.analysis.clarifications.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {reviewed.length === 0 && <p className="text-sm text-muted-foreground">{t("noItems")}</p>}

          <ul className="space-y-3">
            {reviewed.map((r, i) => (
              <li key={i} className={`space-y-2 rounded-xl border border-border p-3 ${r.keep ? "" : "opacity-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t(`types.${r.item.type}`)}</span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.keep}
                      onChange={(e) => update(i, { keep: e.target.checked })}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    {t("keep")}
                  </label>
                </div>
                {r.item.inferred && (
                  <p className="text-xs text-muted-foreground">{t("inferred")}</p>
                )}
                <input
                  aria-label={t("itemTitle")}
                  dir="auto"
                  value={r.item.title}
                  maxLength={200}
                  disabled={!r.keep}
                  onChange={(e) => update(i, { item: { title: e.target.value } })}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3"
                />
                <textarea
                  aria-label={t("itemDescription")}
                  dir="auto"
                  value={r.item.description}
                  rows={2}
                  maxLength={2000}
                  disabled={!r.keep}
                  onChange={(e) => update(i, { item: { description: e.target.value } })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
                {r.item.type === "shopping_list" && (
                  <ul className="list-disc ps-5 text-sm">
                    {r.item.items.map((x, k) => (
                      <li key={k}>{x}</li>
                    ))}
                  </ul>
                )}
                {r.item.type === "task" && (
                  <DateField label={t("dueDate")} value={r.item.dueDate} disabled={!r.keep}
                    onChange={(v) => update(i, { item: { dueDate: v } })} />
                )}
                {r.item.type === "reminder" && (
                  <DateField label={t("remindAt")} required value={r.item.remindAt} disabled={!r.keep}
                    onChange={(v) => update(i, { item: { remindAt: v } })} />
                )}
                {r.item.type === "event" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DateField label={t("startsAt")} required value={r.item.startsAt} disabled={!r.keep}
                      onChange={(v) => update(i, { item: { startsAt: v } })} />
                    <DateField label={t("endsAt")} value={r.item.endsAt} disabled={!r.keep}
                      onChange={(v) => update(i, { item: { endsAt: v } })} />
                  </div>
                )}
                {r.item.evidence && (
                  <blockquote dir="auto" className="border-s-2 border-border ps-3 text-xs text-muted-foreground">
                    {r.item.evidence}
                  </blockquote>
                )}
              </li>
            ))}
          </ul>

          {missingDate && <p role="alert" className="text-sm text-destructive">{t("needDate")}</p>}
          <Button className="w-auto" disabled={busy || missingDate} onClick={() => void confirm()}>
            {t("confirm", { count: kept.length })}
          </Button>
        </section>
      )}

      {rec.processingStatus === "completed" && !msg && (
        <p className="text-sm text-muted-foreground" role="status">{t("completedNote")}</p>
      )}

      {msg && (
        <p role={msg.kind === "error" ? "alert" : "status"} className={msg.kind === "error" ? "text-sm text-destructive" : "text-sm text-success"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

function DateField(props: {
  label: string;
  value: string | null;
  disabled: boolean;
  required?: boolean;
  onChange: (iso: string | null) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{props.label}{props.required ? " *" : ""}</span>
      <input
        type="datetime-local"
        dir="ltr"
        value={toLocalInput(props.value)}
        disabled={props.disabled}
        onChange={(e) => props.onChange(fromLocalInput(e.target.value))}
        className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3"
      />
    </label>
  );
}
