import Link from "next/link";
import { FileAudio } from "lucide-react";
import { LocalDate } from "@/components/ui/local-date";
import { StatusBadge } from "./status-badge";
import { formatDuration } from "@/lib/format";
import type { Recording } from "@/types/domain";

export function RecordingList({ items }: { items: Recording[] }) {
  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/recordings/${r.id}`}
            className="glass flex items-center gap-4 rounded-2xl p-4 transition hover:bg-muted"
          >
            <FileAudio className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.title}</p>
              <p className="text-sm text-muted-foreground">
                <LocalDate iso={r.createdAt} /> · <span dir="ltr">{formatDuration(r.durationSeconds)}</span>
              </p>
            </div>
            <StatusBadge status={r.processingStatus} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
