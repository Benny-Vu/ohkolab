import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/t";

/**
 * Shared date formatting so every page shows the same, locale-aware dates
 * instead of each page rolling its own `toLocaleDateString` call. The
 * active locale comes from `@/lib/i18n/locale`; the wording comes from the
 * dictionaries.
 */

/** "Joined November 2026" in English, "2026年11月に参加" in Japanese. */
export function formatJoined(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const monthYear = new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    year: "numeric",
  }).format(date);
  return t("profile.joined", { date: monthYear });
}

/** "Mar 5, 2024" in English, "2024/03/05" in Japanese. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
  }).format(date);
}
