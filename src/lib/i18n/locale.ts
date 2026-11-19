import { useSyncExternalStore } from "react";

import { loadJapaneseDictionary } from "@/lib/i18n/ja-loader";

/**
 * The active locale: a tiny external store in the shape of
 * `@/lib/preferences`. English is the default; the first visit picks
 * Japanese when the browser says so, and an explicit choice is remembered
 * in local storage under "ohkolab:locale".
 */

export type Locale = "en" | "ja";

const LOCALE_KEY = "ohkolab:locale";

const listeners = new Set<() => void>();

/** "ja" when the browser's language is Japanese, otherwise "en". */
export function detectLocale(): Locale {
  try {
    const language =
      typeof navigator === "undefined" ? undefined : navigator.language;
    return language?.toLowerCase().startsWith("ja") ? "ja" : "en";
  } catch {
    return "en";
  }
}

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === "ja" || stored === "en" ? stored : detectLocale();
  } catch {
    return detectLocale();
  }
}

let currentLocale: Locale | undefined;

/** The active locale, reading the stored choice (or detecting it) once. */
export function getLocale(): Locale {
  currentLocale ??= readLocale();
  return currentLocale;
}

/** Mirrors the locale onto <html lang> so browsers and CSS can react. */
export function applyDocumentLanguage(locale: Locale): void {
  try {
    document.documentElement.lang = locale;
  } catch {
    // No document (tests, SSR): the app still works, just without the tag.
  }
}

/** Switches the locale, stores the choice and notifies the subscribers. */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); the choice holds for this
    // session.
  }
  applyDocumentLanguage(locale);
  // Japanese needs its dictionary chunk; until it arrives the English
  // strings show as the fallback.
  if (locale === "ja") void loadJapaneseDictionary().catch(() => {});
  for (const listener of listeners) listener();
}

/** Called once on startup so <html lang> matches the active locale. */
export function initLocale(): void {
  const locale = getLocale();
  applyDocumentLanguage(locale);
  // A Japanese first start loads the dictionary before the first render,
  // so it is usually in place by the first paint.
  if (locale === "ja") void loadJapaneseDictionary().catch(() => {});
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The active locale and its setter, as React state. */
export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(
    subscribe,
    getLocale,
    () => "en" as const,
  );
  return [locale, setLocale];
}
