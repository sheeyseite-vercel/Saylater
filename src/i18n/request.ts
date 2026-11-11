import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, isLocale, negotiateLocale } from "./config";

// Locale is stored in a cookie (mirrored to the user profile after login),
// falling back to the browser's Accept-Language. Routes are not locale-prefixed.
export default getRequestConfig(async () => {
  const cookieValue = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieValue)
    ? cookieValue
    : negotiateLocale((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
