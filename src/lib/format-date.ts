/**
 * Shared date formatting so every page shows the same, locale-aware dates
 * instead of each page rolling its own `toLocaleDateString` call.
 */

/** "Joined November 2026" for profile headers. */
export function formatJoined(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `Joined ${date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
}

/** "Mar 5, 2024" for tables and quiet metadata lines. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}
