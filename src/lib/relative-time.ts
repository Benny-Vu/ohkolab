import { getLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/t";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "2 hours ago" in the active locale, for timestamps shown to people. */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < MINUTE) return t("relative.justNow");
  if (seconds < HOUR) {
    return t("relative.minutesAgo", { n: Math.floor(seconds / MINUTE) });
  }
  if (seconds < DAY) {
    return t("relative.hoursAgo", { n: Math.floor(seconds / HOUR) });
  }
  if (seconds < WEEK) {
    return t("relative.daysAgo", { n: Math.floor(seconds / DAY) });
  }
  if (seconds < 5 * WEEK) {
    return t("relative.weeksAgo", { n: Math.floor(seconds / WEEK) });
  }
  return formatDate(then, now);
}

function formatDate(date: Date, now: Date): string {
  const month = date.toLocaleString(getLocale(), { month: "short" });
  const day = date.getDate();
  if (date.getFullYear() === now.getFullYear()) {
    return t("relative.dateThisYear", { month, day });
  }
  return t("relative.dateWithYear", {
    month,
    day,
    year: date.getFullYear(),
  });
}
