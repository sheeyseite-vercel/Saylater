"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { GoogleButton } from "./google-button";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { signInWithEmail } from "@/features/auth/actions";
import { authErrorKey, safeNext } from "@/features/auth/auth-errors";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const done = () => {
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (v) => {
          setFormError(null);
          try {
            await signInWithEmail(v.email, v.password);
            done();
          } catch (e) {
            setFormError(authErrorKey(e));
          }
        })}
      >
        <Field
          label={t("email")}
          type="email"
          dir="ltr"
          autoComplete="email"
          error={errors.email?.message && t(errors.email.message)}
          {...register("email")}
        />
        <Field
          label={t("password")}
          type="password"
          dir="ltr"
          autoComplete="current-password"
          error={errors.password?.message && t(errors.password.message)}
          {...register("password")}
        />
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {t(formError)}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {t("login")}
        </Button>
        <Link href="/forgot-password" className="block text-center text-sm text-accent">
          {t("forgot")}
        </Link>
      </form>
      <p className="text-center text-xs text-muted-foreground">{t("or")}</p>
      <GoogleButton onSuccess={done} />
    </div>
  );
}
