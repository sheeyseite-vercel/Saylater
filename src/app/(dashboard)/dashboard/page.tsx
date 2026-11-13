import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mic } from "lucide-react";
import { getSessionUser } from "@/lib/firebase/session";
import { itemsCol } from "@/features/items/server";
import { countRecordings, listRecordings } from "@/features/recordings/server";
import { RecordingList } from "@/components/recordings/recording-list";
import { ResendVerification } from "@/components/auth/resend-verification";
import { Skeleton } from "@/components/ui/skeleton";

// Real data only: nothing is shown for features that do not exist yet.
async function DashboardData({ uid }: { uid: string }) {
  const t = await getTranslations("dashboard");
  const [total, recent, openTasks] = await Promise.all([
    countRecordings(uid),
    listRecordings(uid, { limit: 5 }),
    itemsCol(uid, "tasks").where("status", "==", "pending").count().get().then((s) => s.data().count),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <p className="flex items-baseline gap-3">
          <span className="text-5xl font-semibold tabular-nums leading-none">{total}</span>
          <span className="text-muted-foreground">{t("totalRecordings")}</span>
        </p>
        <Link href="/tasks" className="flex items-baseline gap-3">
          <span className="text-5xl font-semibold tabular-nums leading-none">{openTasks}</span>
          <span className="text-muted-foreground">{t("openTasks")}</span>
        </Link>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("recent")}</h2>
          {total > 0 && (
            <Link href="/recordings" className="text-sm text-accent">
              {t("viewAll")}
            </Link>
          )}
        </div>
        {recent.items.length ? (
          <RecordingList items={recent.items} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("noRecordings")}</p>
        )}
      </section>
    </>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const user = await getSessionUser();

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      {user && !user.emailVerified && (
        <div role="status" className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          <p>{t("verifyEmail")}</p>
          <ResendVerification />
        </div>
      )}

      <Link
        href="/capture"
        className="btn-solid flex items-center justify-between gap-4 rounded-xl bg-primary p-5 text-primary-foreground"
      >
        <span className="text-xl font-semibold">{t("quickRecord")}</span>
        <Mic className="h-7 w-7 shrink-0" aria-hidden="true" />
      </Link>

      {/* The button renders immediately; the data streams in behind a skeleton. */}
      {user && (
        <Suspense
          fallback={
            <>
              <Skeleton className="h-14 w-40" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          }
        >
          <DashboardData uid={user.uid} />
        </Suspense>
      )}
    </main>
  );
}
