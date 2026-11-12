import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mic } from "lucide-react";

export default function LandingPage() {
  const t = useTranslations();
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="brand-gradient flex h-24 w-24 items-center justify-center rounded-[1.75rem] text-primary-foreground shadow-[0_0_80px_-10px_hsl(var(--primary)/0.65)]">
        <Mic className="h-11 w-11" aria-hidden="true" />
      </div>
      <h1 className="brand-gradient bg-clip-text text-4xl font-bold leading-tight text-transparent sm:text-6xl">
        {t("landing.headline")}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">{t("landing.subhead")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/register" className="brand-gradient rounded-xl px-7 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.98]">
          {t("landing.cta")}
        </Link>
        <Link href="/login" className="glass rounded-xl px-7 py-3 font-medium transition hover:bg-muted">
          {t("landing.signIn")}
        </Link>
      </div>
    </main>
  );
}
