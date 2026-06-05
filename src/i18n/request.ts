import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const messageImports = {
  en: () => import("../messages/en.json"),
  zh: () => import("../messages/zh.json"),
  ms: () => import("../messages/ms.json"),
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "zh" | "ms")) {
    locale = routing.defaultLocale;
  }
  const messages = (await messageImports[locale as keyof typeof messageImports]()).default;
  return {
    locale,
    messages,
  };
});
