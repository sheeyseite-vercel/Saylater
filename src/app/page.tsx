import Link from "next/link";
import { useTranslations } from "next-intl";

// Foundation-phase landing page. Marketing sections arrive with Phase 7 polish.
export default function LandingPage() {
  const t = useTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-4 text-center">
      <h1 className="brand-gradient bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
        {t("landing.headline")}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">{t("landing.subhead")}</p>
      <div className="flex gap-3">
        <Link href="/register" className="brand-gradient rounded-xl px-6 py-3 font-medium text-primary-foreground">
          {t("landing.cta")}
        </Link>
        <Link href="/login" className="glass rounded-xl px-6 py-3 font-medium">
          {t("landing.signIn")}
        </Link>
      </div>
    </main>
  );
}
