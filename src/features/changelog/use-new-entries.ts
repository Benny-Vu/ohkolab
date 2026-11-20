import { useCallback, useEffect, useState } from "react";

import { changelogEntries } from "@/features/changelog/entries";

/**
 * Which releases the visitor has already seen. Kept on the device only
 * (localStorage, try/catch): no account, no sync, nothing sent anywhere.
 */
const SEEN_KEY = "ohkolab:changelog:seen";

/** The newest release's date, or "" when the changelog is empty. */
export function latestChangelogDate(): string {
  return changelogEntries[0]?.date ?? "";
}

/** True when there is a release newer than the one last seen. */
export function hasUnseenChangelog(now: Date = new Date()): boolean {
  const seen = readSeenDate();
  if (seen === null) {
    // First visit: "seen" is the visit date, so only entries released
    // after it count as new.
    return latestChangelogDate() > isoDay(now);
  }
  return latestChangelogDate() > seen;
}

/** Remembers the newest release as seen. Safe to call repeatedly. */
export function markChangelogSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, latestChangelogDate());
  } catch {
    // Storage can be unavailable; the dot just stays on.
  }
}

function readSeenDate(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The "New" dot state for menus: unseen on first render, then markable. */
export function useChangelogSeen(): {
  unseen: boolean;
  markSeen: () => void;
} {
  const [unseen, setUnseen] = useState(() => hasUnseenChangelog());
  const markSeen = useCallback(() => {
    markChangelogSeen();
    setUnseen(false);
  }, []);
  return { unseen, markSeen };
}

/** Marks the newest release as seen when the changelog page is visited. */
export function useMarkChangelogSeenOnMount(): void {
  useEffect(() => {
    markChangelogSeen();
  }, []);
}
