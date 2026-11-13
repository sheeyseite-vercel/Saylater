"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalDate } from "@/components/ui/local-date";
import { formatBytes, formatDuration } from "@/lib/format";
import { revalidateRecordings } from "@/features/recordings/actions";
import type { Recording } from "@/types/domain";

type Pending = null | "rename" | "audio" | "all";

export function RecordingDetail({ recording }: { recording: Recording }) {
  const t = useTranslations("recordings");
  const router = useRouter();
  const [title, setTitle] = useState(recording.title);
  const [busy, setBusy] = useState<Pending>(null);
  const [confirm, setConfirm] = useState<"audio" | "all" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; key: string } | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);

  const hasAudio = Boolean(recording.audioPath);

  async function rename() {
    setBusy("rename");
    setMessage(null);
    const res = await fetch(`/api/recordings/${recording.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => null);
    setBusy(null);
    if (res?.ok) {
      setMessage({ kind: "ok", key: "saved" });
      await revalidateRecordings();
      router.refresh();
    } else {
      setMessage({ kind: "error", key: "saveFailed" });
    }
  }

  async function remove(audioOnly: boolean) {
    setBusy(audioOnly ? "audio" : "all");
    setMessage(null);
    const res = await fetch(`/api/recordings/${recording.id}${audioOnly ? "?audioOnly=1" : ""}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(null);
    setConfirm(null);
    if (!res?.ok) return setMessage({ kind: "error", key: "deleteFailed" });
    await revalidateRecordings();
    if (audioOnly) {
      setMessage({ kind: "ok", key: "audioDeleted" });
      router.refresh();
    } else {
      router.replace("/recordings");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/recordings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t("back")}
      </Link>

      <section className="glass space-y-4 rounded-2xl p-6">
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            {t("rename")}
          </label>
          <div className="flex gap-2">
            <input
              id="title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3"
            />
            <Button
              className="w-auto"
              disabled={busy !== null || !title.trim() || title.trim() === recording.title}
              onClick={rename}
            >
              {t("saveTitle")}
            </Button>
          </div>
        </div>

        {hasAudio && !audioFailed ? (
          <audio
            controls
            preload="metadata"
            src={`/api/recordings/${recording.id}/audio`}
            className="w-full"
            onError={() => setAudioFailed(true)}
          />
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            {hasAudio ? t("audioError") : t("audioRemoved")}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{t("created")}</dt>
            <dd><LocalDate iso={recording.createdAt} /></dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("duration")}</dt>
            <dd dir="ltr" className="text-start">{formatDuration(recording.durationSeconds)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("format")}</dt>
            <dd dir="ltr" className="text-start">{recording.audioFormat}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("size")}</dt>
            <dd dir="ltr" className="text-start">{formatBytes(recording.audioBytes)}</dd>
          </div>
        </dl>
      </section>

      <section className="glass space-y-3 rounded-2xl p-6">
        {confirm === null ? (
          <div className="flex flex-wrap gap-2">
            {hasAudio && (
              <Button variant="ghost" className="w-auto" onClick={() => setConfirm("audio")}>
                {t("deleteAudio")}
              </Button>
            )}
            <Button variant="ghost" className="w-auto text-destructive" onClick={() => setConfirm("all")}>
              {t("deleteRecording")}
            </Button>
          </div>
        ) : (
          <div role="alertdialog" aria-label={t("confirmTitle")} className="space-y-3">
            <p className="text-sm">{confirm === "audio" ? t("confirmAudio") : t("confirmAll")}</p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                className="w-auto"
                disabled={busy !== null}
                onClick={() => remove(confirm === "audio")}
              >
                {t("confirmYes")}
              </Button>
              <Button variant="ghost" className="w-auto" disabled={busy !== null} onClick={() => setConfirm(null)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-destructive" : "text-sm text-success"}>
            {t(message.key)}
          </p>
        )}
      </section>
    </div>
  );
}
