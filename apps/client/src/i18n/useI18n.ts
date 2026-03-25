import { ref } from "vue";
import { messages, type Locale } from "./messages";

const STORAGE_KEY = "runebrawl.locale";

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "de" || stored === "en") {
    return stored;
  }
  const browserLocale = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "en";
  if (browserLocale.startsWith("de")) {
    return "de";
  }
  return "en";
}

const localeRef = ref<Locale>(readStoredLocale());

function formatTemplate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function useI18n() {
  function setLocale(next: Locale): void {
    localeRef.value = next;
    localStorage.setItem(STORAGE_KEY, next);
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const active = messages[localeRef.value][key];
    const fallback = messages.en[key];
    const template = active ?? fallback ?? key;
    return formatTemplate(template, params);
  }

  return {
    locale: localeRef,
    setLocale,
    t
  };
}
