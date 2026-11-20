/**
 * Pure date bucketing for the notifications list: Today, This week and
 * Earlier. "Today" is the viewer's calendar day; "This week" covers the
 * seven days before that. No I/O, no React.
 */

import type { TranslationKey } from "@/lib/i18n/en";
import {
  rowCreatedAt,
  type NotificationRow,
} from "@/lib/notifications/grouping";

/** The sections of the notifications page, in display order. */
export type NotificationSectionName = "today" | "thisWeek" | "earlier";

/** Display order of the sections. */
const NOTIFICATION_SECTION_ORDER: readonly NotificationSectionName[] = [
  "today",
  "thisWeek",
  "earlier",
];

/** The heading key for each section. */
export const NOTIFICATION_SECTION_LABEL_KEYS: Record<
  NotificationSectionName,
  TranslationKey
> = {
  today: "notifications.sectionToday",
  thisWeek: "notifications.sectionThisWeek",
  earlier: "notifications.sectionEarlier",
};

/** One section of the notifications page: its name and its rows. */
export interface NotificationSection {
  name: NotificationSectionName;
  rows: NotificationRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Whether both dates fall on the same local calendar day. */
function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The section one timestamp belongs in, given the viewing time: today for
 * the viewer's calendar day (a clock in the future counts as today), this
 * week for the seven days before that, earlier for everything older.
 */
export function notificationSection(
  createdAt: string,
  now: Date,
): NotificationSectionName {
  const time = Date.parse(createdAt);
  if (Number.isNaN(time)) {
    return "earlier";
  }
  if (time > now.getTime() || sameLocalDay(new Date(time), now)) {
    return "today";
  }
  if (time >= now.getTime() - WEEK_MS) {
    return "thisWeek";
  }
  return "earlier";
}

/**
 * Buckets rows into the Today / This week / Earlier sections, in that
 * order, skipping empty sections. A grouped row lands in the section of
 * its newest notification.
 */
export function sectionNotifications(
  rows: NotificationRow[],
  now: Date,
): NotificationSection[] {
  const buckets: Record<NotificationSectionName, NotificationRow[]> = {
    today: [],
    thisWeek: [],
    earlier: [],
  };
  for (const row of rows) {
    buckets[notificationSection(rowCreatedAt(row), now)].push(row);
  }
  return NOTIFICATION_SECTION_ORDER.filter(
    (name) => buckets[name].length > 0,
  ).map((name) => ({ name, rows: buckets[name] }));
}
