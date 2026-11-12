import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mic } from "lucide-react";
import { getSessionUser } from "@/lib/firebase/session";
import { countRecordings, listRecordings } from "@/features/recordings/server";
import { RecordingList } from "@/components/recordings/recording-list";
import { ResendVerification } from "@/components/auth/resend-verification";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const user = await getSessionUser();
  const name = user?.name ?? user?.email?.split("@")[0] ?? "";
  // Real data only: nothing is shown for features that do not exist yet.
  const [total, recent] = user
    ? await Promise.all([countRecordings(user.uid), listRecordings(user.uid, { limit: 5 })])
    : [0, { items: [], nextCursor: null }];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("welcome", { name })}</h1>

      {user && !user.emailVerified && (
        <div role="status" className="glass rounded-xl p-4 text-sm text-muted-foreground">
          <p>{t("verifyEmail")}</p>
          <ResendVerification />
        </div>
      )}

      <Link
        href="/capture"
        className="brand-gradient flex items-center justify-center gap-3 rounded-2xl p-6 text-lg font-semibold text-primary-foreground shadow-lg transition hover:scale-[1.01]"
      >
        <Mic className="h-6 w-6" aria-hidden="true" />
        {t("quickRecord")}
      </Link>

      <section className="glass rounded-2xl p-5">
        <p className="text-sm text-muted-foreground">{t("totalRecordings")}</p>
        <p className="text-3xl font-semibold tabular-nums">{total}</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("recent")}</h2>
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
    </main>
  );
}
