import { describe, expect, it } from "vitest";
import { forgotSchema, loginSchema, registerSchema } from "@/features/auth/schemas";
import { authErrorKey, safeNext } from "@/features/auth/auth-errors";

describe("auth schemas", () => {
  it("rejects invalid email and short passwords with i18n keys", () => {
    const r = registerSchema.safeParse({ name: "A", email: "nope", password: "short", confirmPassword: "short" });
    expect(r.success).toBe(false);
    const msgs = !r.success ? r.error.issues.map((i) => i.message) : [];
    expect(msgs).toContain("errors.email");
    expect(msgs).toContain("errors.passwordShort");
  });

  it("requires matching passwords", () => {
    const r = registerSchema.safeParse({
      name: "A", email: "a@b.co", password: "longenough1", confirmPassword: "different1",
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid login and forgot input", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(forgotSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
  });
});

describe("authErrorKey", () => {
  it("maps Firebase codes to keys", () => {
    expect(authErrorKey({ code: "auth/invalid-credential" })).toBe("errors.invalidCredentials");
    expect(authErrorKey({ code: "auth/email-already-in-use" })).toBe("errors.emailInUse");
    expect(authErrorKey(new Error("Authentication backend is not configured"))).toBe("errors.notConfigured");
    expect(authErrorKey(new Error("boom"))).toBe("errors.generic");
  });
});

describe("safeNext", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNext("/tasks")).toBe("/tasks");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});
