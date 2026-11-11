import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const t = useTranslations("auth");
  return (
    <AuthCard
      title={t("registerTitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="text-accent">
            {t("login")}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
