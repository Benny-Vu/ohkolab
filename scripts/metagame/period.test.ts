import { describe, expect, it } from "vitest";

import {
  formatPeriod,
  formatPeriodLabel,
  isPeriod,
  parsePeriodArg,
  previousPeriod,
} from "./period.ts";

describe("isPeriod", () => {
  it("accepts YYYY-MM", () => {
    expect(isPeriod("2026-10")).toBe(true);
    expect(isPeriod("1999-01")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isPeriod("2026-13")).toBe(false);
    expect(isPeriod("2026-00")).toBe(false);
    expect(isPeriod("2026-1")).toBe(false);
    expect(isPeriod("26-10")).toBe(false);
    expect(isPeriod("2026/10")).toBe(false);
    expect(isPeriod("")).toBe(false);
  });
});

describe("formatPeriodLabel", () => {
  it("spells out the month", () => {
    expect(formatPeriodLabel("2026-10")).toBe("October 2026");
    expect(formatPeriodLabel("2026-01")).toBe("January 2026");
  });
});

describe("formatPeriod", () => {
  it("formats a UTC date", () => {
    expect(formatPeriod(new Date(Date.UTC(2026, 10, 16)))).toBe("2026-11");
  });
});

describe("previousPeriod", () => {
  it("rolls back across the year boundary", () => {
    expect(previousPeriod(new Date(Date.UTC(2026, 0, 3)))).toBe("2025-12");
    expect(previousPeriod(new Date(Date.UTC(2026, 10, 16)))).toBe("2026-10");
  });
});

describe("parsePeriodArg", () => {
  it("reads --period", () => {
    expect(parsePeriodArg(["--period", "2026-09"])).toBe("2026-09");
  });

  it("returns undefined without the flag", () => {
    expect(parsePeriodArg([])).toBeUndefined();
    expect(parsePeriodArg(["--other"])).toBeUndefined();
  });

  it("throws on a missing or invalid value", () => {
    expect(() => parsePeriodArg(["--period"])).toThrow();
    expect(() => parsePeriodArg(["--period", "2026-13"])).toThrow();
    expect(() => parsePeriodArg(["--period", "nope"])).toThrow();
  });
});
