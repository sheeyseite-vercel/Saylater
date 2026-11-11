"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { GoogleButton } from "./google-button";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";
import { registerWithEmail } from "@/features/auth/actions";
import { authErrorKey } from "@/features/auth/auth-errors";

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const done = () => {
    router.replace("/dashboard");
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
            await registerWithEmail(v.name, v.email, v.password);
            done();
          } catch (e) {
            setFormError(authErrorKey(e));
          }
        })}
      >
        <Field
          label={t("name")}
          autoComplete="name"
          error={errors.name?.message && t(errors.name.message)}
          {...register("name")}
        />
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
          autoComplete="new-password"
          error={errors.password?.message && t(errors.password.message)}
          {...register("password")}
        />
        <Field
          label={t("confirmPassword")}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          error={errors.confirmPassword?.message && t(errors.confirmPassword.message)}
          {...register("confirmPassword")}
        />
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {t(formError)}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {t("register")}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">{t("or")}</p>
      <GoogleButton onSuccess={done} />
    </div>
  );
}
