import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Mic } from "lucide-react";
import { getSessionUser } from "@/lib/firebase/session";
import { listRecordings } from "@/features/recordings/server";
import { RecordingList } from "@/components/recordings/recording-list";

export default async function RecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { after } = await searchParams;
  const t = await getTranslations("recordings");
  const { items, nextCursor } = await listRecordings(user.uid, { limit: 20, after: after ?? null });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Link href="/capture" className="brand-gradient inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-primary-foreground">
          <Mic className="h-4 w-4" aria-hidden="true" />
          {t("newRecording")}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
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
    </main>
  );
}
