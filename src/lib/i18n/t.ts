import { useCallback } from "react";

import { en, type TranslationKey } from "@/lib/i18n/en";
import { ja } from "@/lib/i18n/ja";
import { getLocale, useLocale, type Locale } from "@/lib/i18n/locale";

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

/** The translation of a key in one explicit locale. */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const template = locale === "ja" ? (ja[key] ?? en[key]) : (en[key] ?? key);
  return interpolate(template, params);
}

/**
 * Translates a key in the active locale, for non-React code (lib modules,
 * tests). React components should use `useT()` so they re-render when the
 * locale changes.
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  return translate(getLocale(), key, params);
}

/** The translator as a hook: re-renders when the locale changes. */
export function useT(): (
  key: TranslationKey,
  params?: TranslationParams,
) => string {
  const [locale] = useLocale();
  return useCallback((key, params) => translate(locale, key, params), [locale]);
}
