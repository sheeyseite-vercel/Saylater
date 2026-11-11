import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/firebase/session";
import { ResendVerification } from "@/components/auth/resend-verification";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const user = await getSessionUser();
  const name = user?.name ?? user?.email?.split("@")[0] ?? "";
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("welcome", { name })}</h1>
      {user && !user.emailVerified && (
        <div role="status" className="glass rounded-xl p-4 text-sm text-muted-foreground">
          <p>{t("verifyEmail")}</p>
          <ResendVerification />
        </div>
      )}
    </main>
  );
}
