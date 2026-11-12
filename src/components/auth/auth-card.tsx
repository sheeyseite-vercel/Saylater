import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useTranslations("brand");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          {t("name")}
        </Link>
        <LocaleSwitcher />
      </div>
      <section className="glass rounded-2xl p-6">
        <h1 className="mb-6 text-xl font-semibold">{title}</h1>
        {children}
      </section>
      {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
    </main>
  );
}
