import { getTranslations } from "next-intl/server";
import type { ProcessingStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

export async function StatusBadge({ status }: { status: ProcessingStatus }) {
  const t = await getTranslations("recordings.status");
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "failed" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
        status === "completed" && "bg-success/15 text-success",
      )}
    >
      {t(status)}
    </span>
  );
}
