import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/features/feed/relative-time";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("formatRelativeTime", () => {
  it("returns an empty string for invalid timestamps", () => {
    expect(formatRelativeTime("not-a-date", NOW)).toBe("");
  });

  it("returns just now for timestamps less than a minute old", () => {
    expect(formatRelativeTime("2026-06-15T11:59:30Z", NOW)).toBe("just now");
  });

  it("returns just now for future timestamps", () => {
    expect(formatRelativeTime("2026-06-15T12:01:00Z", NOW)).toBe("just now");
  });

  it("returns minutes", () => {
    expect(formatRelativeTime("2026-06-15T11:30:00Z", NOW)).toBe("30m ago");
  });

  it("returns hours", () => {
    expect(formatRelativeTime("2026-06-15T07:00:00Z", NOW)).toBe("5h ago");
  });

  it("returns days", () => {
    expect(formatRelativeTime("2026-06-13T12:00:00Z", NOW)).toBe("2d ago");
  });

  it("returns weeks", () => {
    expect(formatRelativeTime("2026-05-31T12:00:00Z", NOW)).toBe("2w ago");
  });

  it("returns a month and day for older timestamps in the same year", () => {
    expect(formatRelativeTime("2026-01-10T12:00:00Z", NOW)).toBe("Jan 10");
  });

  it("includes the year for timestamps from a previous year", () => {
    expect(formatRelativeTime("2024-03-05T12:00:00Z", NOW)).toBe("Mar 5, 2024");
  });
});
