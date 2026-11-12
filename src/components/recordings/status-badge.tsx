import { getTranslations } from "next-intl/server";
import type { ProcessingStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

const RUNNING = ["transcription_queued", "transcribing", "analysis_queued", "analyzing"];

export async function StatusBadge({ status }: { status: ProcessingStatus }) {
  const t = await getTranslations("recordings.status");
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          status === "completed" && "bg-success",
          status === "failed" && "bg-destructive",
          status === "awaiting_review" && "bg-primary",
          RUNNING.includes(status) && "animate-pulse bg-primary",
          !["completed", "failed", "awaiting_review", ...RUNNING].includes(status) && "bg-muted-foreground",
        )}
      />
      {t(status)}
    </span>
  );
}
