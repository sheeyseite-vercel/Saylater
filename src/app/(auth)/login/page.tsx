import { Suspense } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <AuthCard
      title={t("loginTitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/register" className="text-accent">
            {t("register")}
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
