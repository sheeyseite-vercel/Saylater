/** Map a Firebase/session error to an i18n key under the "auth" namespace. */
export function authErrorKey(e: unknown): string {
  const code =
    typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "errors.invalidCredentials";
    case "auth/email-already-in-use":
      return "errors.emailInUse";
    case "auth/weak-password":
      return "errors.weakPassword";
    case "auth/too-many-requests":
      return "errors.tooManyRequests";
    case "auth/network-request-failed":
      return "errors.network";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "errors.popupClosed";
    default:
      return e instanceof Error && e.message.includes("not configured")
        ? "errors.notConfigured"
        : "errors.generic";
  }
}

/** Only allow same-site relative redirects after login. */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}
