import Link from "next/link";
import { LocalDate } from "@/components/ui/local-date";
import { StatusBadge } from "./status-badge";
import { formatDuration } from "@/lib/format";
import type { Recording } from "@/types/domain";

/** A ledger, not a stack of cards: one hairline-separated row per recording. */
export function RecordingList({ items }: { items: Recording[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((r) => (
        <li key={r.id}>
          <Link href={`/recordings/${r.id}`} className="row-hover flex items-center gap-4 px-1 py-4">
            <span dir="ltr" className="w-12 shrink-0 text-lg font-extrabold tabular-nums">
              {formatDuration(r.durationSeconds)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.title}</p>
              <p className="text-sm text-muted-foreground">
                <LocalDate iso={r.createdAt} />
              </p>
            </div>
            <StatusBadge status={r.processingStatus} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
