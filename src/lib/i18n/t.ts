import { useCallback } from "react";

import { en, type TranslationKey } from "@/lib/i18n/en";
import { getLocale, useLocale, type Locale } from "@/lib/i18n/locale";
import { japaneseTemplate, useJapaneseDictionary } from "@/lib/i18n/ja-loader";

export type TranslationParams = Record<string, string | number>;

const PLACEHOLDER_RE = /\{(\w+)\}/g;

/** Replaces every `{name}` placeholder that has a value. */
export function interpolate(
  template: string,
  params?: TranslationParams,
): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER_RE, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : match,
  );
}

/**
 * The translation of a key in one explicit locale. The Japanese dictionary
 * loads from its own chunk: until it arrives the English template shows
 * (never a raw key, never blank), which is also the fallback for keys it
 * does not know.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const template =
    locale === "ja" ? (japaneseTemplate(key) ?? en[key]) : (en[key] ?? key);
  return interpolate(template, params);
}

/**
 * Translates a key in the active locale, for non-React code (lib modules,
 * tests). React components should use `useT()` so they re-render when the
 * locale changes or the Japanese dictionary finishes loading.
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  return translate(getLocale(), key, params);
}

/**
 * The translator as a hook: re-renders when the locale changes and again
 * when the lazily loaded Japanese dictionary arrives.
 */
export function useT(): (
  key: TranslationKey,
  params?: TranslationParams,
) => string {
  const [locale] = useLocale();
  // Re-render when the Japanese dictionary finishes loading; the lookup
  // happens at call time, so the callback itself only tracks the locale.
  useJapaneseDictionary();
  return useCallback((key, params) => translate(locale, key, params), [locale]);
}
