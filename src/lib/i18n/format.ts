import { getLocale } from "@/lib/i18n/locale";

/**
 * Locale-aware number and percentage formatting. The date helpers stay in
 * `@/lib/format-date` (they keep their existing names); everything routes
 * the active locale through `getLocale()`.
 */

/** 1,234 in English, 1,234 in Japanese (grouping follows the locale). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(getLocale()).format(value);
}

/**
 * A percentage: `formatPercent(0.2345)` is "23.5%" in English and
 * "23.5%" in Japanese (the digits and separators follow the locale).
 * `value` is a fraction between 0 and 1.
 */
export function formatPercent(value: number, digits = 1): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
