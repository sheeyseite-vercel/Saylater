import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forgot-form";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  return (
    <AuthCard
      title={t("forgotTitle")}
      footer={
        <Link href="/login" className="text-accent">
          {t("backToLogin")}
        </Link>
      }
    >
      <ForgotForm />
    </AuthCard>
  );
}
