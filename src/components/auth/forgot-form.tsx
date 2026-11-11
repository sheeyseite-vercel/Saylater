"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { forgotSchema, type ForgotValues } from "@/features/auth/schemas";
import { requestPasswordReset } from "@/features/auth/actions";
import { authErrorKey } from "@/features/auth/auth-errors";

export function ForgotForm() {
  const t = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

  if (sent) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("resetSent")}
      </p>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        setFormError(null);
        try {
          await requestPasswordReset(v.email);
          setSent(true);
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
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {t(formError)}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {t("sendReset")}
      </Button>
    </form>
  );
}
