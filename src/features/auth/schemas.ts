import { z } from "zod";

// Messages are i18n keys under the "auth" namespace; forms translate them for display.
export const emailField = z.string().trim().min(1, "errors.required").email("errors.email");
export const passwordField = z.string().min(8, "errors.passwordShort").max(128);

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "errors.required"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "errors.required").max(80),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "errors.required"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "errors.passwordMismatch",
  });

export const forgotSchema = z.object({ email: emailField });

export const sessionBodySchema = z.object({ idToken: z.string().min(20).max(4096) });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
