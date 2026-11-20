import { useCallback } from "react";

import type { TranslationKey } from "@/lib/i18n/en";
import { englishTemplate, useEnglishDictionary } from "@/lib/i18n/en-loader";
import { getLocale, useLocale, type Locale } from "@/lib/i18n/locale";
import { japaneseTemplate, useJapaneseDictionary } from "@/lib/i18n/ja-loader";

export type TranslationParams = Record<string, string | number>;

const PLACEHOLDER_RE = /\{(\w+)\}/g;

/** Replaces every `{name}` placeholder that has a value. */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER_RE, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : match,
  );
}

/**
 * The translation of a key in one explicit locale. Both dictionaries load
 * from their own chunks: until they arrive the fallback chain runs (Japanese
 * falls back to English, English to the raw key, never blank).
 */
function translate(
  locale: Locale,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const template =
    locale === "ja"
      ? (japaneseTemplate(key) ?? englishTemplate(key) ?? key)
      : (englishTemplate(key) ?? key);
  return interpolate(template, params);
}

/**
 * Translates a key in the active locale, for non-React code (lib modules,
 * tests). React components should use `useT()` so they re-render when the
 * locale changes or a lazily loaded dictionary finishes loading.
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  return translate(getLocale(), key, params);
}

/**
 * The translator as a hook: re-renders when the locale changes and again
 * whenever a lazily loaded dictionary (Japanese or an English feature
 * domain) arrives.
 */
export function useT(): (
  key: TranslationKey,
  params?: TranslationParams,
) => string {
  const [locale] = useLocale();
  // Re-render when the dictionaries finish loading; the lookup happens at
  // call time, so the callback itself only tracks the locale.
  useJapaneseDictionary();
  useEnglishDictionary();
  return useCallback((key, params) => translate(locale, key, params), [locale]);
}
