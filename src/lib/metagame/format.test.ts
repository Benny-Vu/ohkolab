import { expect, test } from "vitest";
import { snapshotFixture } from "@/lib/metagame/fixture";
import {
  formatAttribution,
  formatBattles,
  formatPeriod,
  formatShare,
} from "@/lib/metagame/format";

test("formatShare renders fractions as percentages", () => {
  expect(formatShare(0.234)).toBe("23.4%");
  expect(formatShare(0)).toBe("0.0%");
  expect(formatShare(1)).toBe("100.0%");
  expect(formatShare(0.0004)).toBe("0.0%");
});

test("formatShare renders null as a dash", () => {
  expect(formatShare(null)).toBe("—");
});

test("formatPeriod renders month names", () => {
  expect(formatPeriod("2026-10")).toBe("October 2026");
  expect(formatPeriod("2026-01")).toBe("January 2026");
  expect(formatPeriod("2026-12")).toBe("December 2026");
});

test("formatPeriod passes invalid periods through", () => {
  expect(formatPeriod("2026-13")).toBe("2026-13");
  expect(formatPeriod("october")).toBe("october");
  expect(formatPeriod("")).toBe("");
});

test("formatBattles groups thousands", () => {
  expect(formatBattles(1649648)).toBe("1,649,648");
  expect(formatBattles(0)).toBe("0");
  expect(formatBattles(999)).toBe("999");
});

test("formatAttribution matches the data-sources note", () => {
  expect(formatAttribution(snapshotFixture)).toBe(
    "Pokémon Showdown ladder, October 2026, rating 1630+, via smogon.com/stats",
  );
});

test("formatAttribution does not repeat parts already in the label", () => {
  const full =
    "Pokémon Showdown ladder, October 2026, rating 1630+, via smogon.com/stats";
  const snapshot = {
    ...snapshotFixture,
    source: { ...snapshotFixture.source, label: full },
  };
  expect(formatAttribution(snapshot)).toBe(full);
});
