import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mic } from "lucide-react";

export default function LandingPage() {
  const t = useTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-8 px-6">
      <span className="btn-solid flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Mic className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-5xl font-semibold leading-[1.1] tracking-tight sm:text-7xl">{t("landing.headline")}</h1>
      <p className="max-w-xl text-lg text-muted-foreground">{t("landing.subhead")}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/register" className="btn-solid rounded-xl bg-primary px-7 py-3 font-semibold text-primary-foreground">
          {t("landing.cta")}
        </Link>
        <Link href="/login" className="rounded-xl border border-border bg-card px-7 py-3 font-semibold hover:bg-muted">
          {t("landing.signIn")}
        </Link>
      </div>
    </main>
  );
}
