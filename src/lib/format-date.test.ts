import { describe, expect, it } from "vitest";

import { formatDate, formatJoined } from "@/lib/format-date";

describe("formatJoined", () => {
  it("formats a date as 'Joined <Month Year>'", () => {
    expect(formatJoined("2026-11-05T00:00:00Z")).toBe("Joined November 2026");
  });

  it("formats a March date deterministically across timezones", () => {
    expect(formatJoined("2024-03-05T00:00:00Z")).toBe("Joined March 2024");
  });

  it("returns the raw string for an invalid date", () => {
    expect(formatJoined("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDate", () => {
  it("formats a date in medium date style", () => {
    expect(formatDate("2024-03-05T00:00:00Z")).toBe("Mar 5, 2024");
  });

  it("returns the raw string for an invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
