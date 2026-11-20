import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { changelogEntries } from "@/features/changelog/entries";
import {
  hasUnseenChangelog,
  latestChangelogDate,
  markChangelogSeen,
} from "@/features/changelog/use-new-entries";

const SEEN_KEY = "ohkolab:changelog:seen";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("entries are newest first and bilingual", () => {
  for (const entry of changelogEntries) {
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entry.en.length).toBeGreaterThan(0);
    expect(entry.ja.length).toBeGreaterThan(0);
  }
  const dates = changelogEntries.map((entry) => entry.date);
  const sorted = [...dates].sort().reverse();
  expect(dates).toEqual(sorted);
});

test("the newest entry's date is the latest date", () => {
  const newest = changelogEntries.reduce(
    (max, entry) => (entry.date > max ? entry.date : max),
    "",
  );
  expect(latestChangelogDate()).toBe(newest);
});

test("a release newer than the last seen one counts as unseen", () => {
  localStorage.setItem(SEEN_KEY, "2026-01-01");
  expect(hasUnseenChangelog()).toBe(true);
});

test("a seen release is not unseen", () => {
  localStorage.setItem(SEEN_KEY, latestChangelogDate());
  expect(hasUnseenChangelog()).toBe(false);
});

test("a first visit only counts entries released after it as new", () => {
  // Nothing stored: the visit date decides.
  expect(hasUnseenChangelog(new Date("2026-01-01T00:00:00Z"))).toBe(true);
  expect(hasUnseenChangelog(new Date("2100-01-01T00:00:00Z"))).toBe(false);
});

test("markChangelogSeen stores the newest date and clears the dot", () => {
  markChangelogSeen();
  expect(localStorage.getItem(SEEN_KEY)).toBe(latestChangelogDate());
  expect(hasUnseenChangelog()).toBe(false);
});

test("storage failures are safe", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("unavailable");
  });
  expect(hasUnseenChangelog(new Date("2026-01-01T00:00:00Z"))).toBe(true);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("unavailable");
  });
  expect(() => markChangelogSeen()).not.toThrow();
});
