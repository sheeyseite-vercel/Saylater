import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Mic } from "lucide-react";
import { getSessionUser } from "@/lib/firebase/session";
import { listRecordings } from "@/features/recordings/server";
import { RecordingList } from "@/components/recordings/recording-list";
import { PendingUploads } from "@/components/offline/pending-uploads";
import { Skeleton } from "@/components/ui/skeleton";

async function RecordingsData({ uid, after }: { uid: string; after: string | null }) {
  const t = await getTranslations("recordings");
  const { items, nextCursor } = await listRecordings(uid, { limit: 20, after });
  return (
    <>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">{t("empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        <RecordingList items={items} />
      )}

      <div className="flex justify-between text-sm">
        {after ? (
          <Link href="/recordings" className="text-accent">
            {t("newest")}
          </Link>
        ) : (
          <span />
        )}
        {nextCursor && (
          <Link href={`/recordings?after=${nextCursor}`} className="text-accent">
            {t("older")}
          </Link>
        )}
      </div>
    </>
  );
}

export default async function RecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { after } = await searchParams;
  const t = await getTranslations("recordings");

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <Link
          href="/capture"
          className="btn-solid inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Mic className="h-4 w-4" aria-hidden="true" />
          {t("newRecording")}
        </Link>
      </div>

      <PendingUploads />

      <Suspense
        key={after ?? "first"}
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        }
      >
        <RecordingsData uid={user.uid} after={after ?? null} />
      </Suspense>
    </main>
  );
}
