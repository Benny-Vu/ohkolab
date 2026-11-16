import { describe, expect, it } from "vitest";

import {
  remainingStatPoints,
  withStatPoints,
} from "@/components/pokemon-editor/stat-points";
import { emptyStatsTable } from "@/types/pokemon";

describe("remainingStatPoints", () => {
  it("is the full budget when nothing is spent", () => {
    expect(remainingStatPoints(emptyStatsTable())).toBe(66);
  });

  it("subtracts what is spent", () => {
    expect(
      remainingStatPoints({ ...emptyStatsTable(), atk: 32, spe: 12 }),
    ).toBe(22);
  });

  it("goes negative when the set is over the limit", () => {
    expect(
      remainingStatPoints({
        ...emptyStatsTable(),
        hp: 32,
        atk: 32,
        def: 32,
      }),
    ).toBe(-30);
  });
});

describe("withStatPoints", () => {
  it("sets a stat within both limits", () => {
    expect(withStatPoints(emptyStatsTable(), "atk", 12)).toEqual({
      ...emptyStatsTable(),
      atk: 12,
    });
  });

  it("clamps to the per-stat maximum", () => {
    expect(withStatPoints(emptyStatsTable(), "hp", 40)).toEqual({
      ...emptyStatsTable(),
      hp: 32,
    });
  });

  it("clamps to what the total budget leaves free", () => {
    const spent = { ...emptyStatsTable(), atk: 32, def: 32 };
    expect(withStatPoints(spent, "spe", 10)).toEqual({
      ...emptyStatsTable(),
      atk: 32,
      def: 32,
      spe: 2,
    });
  });

  it("truncates fractional requests", () => {
    expect(withStatPoints(emptyStatsTable(), "atk", 12.9)).toEqual({
      ...emptyStatsTable(),
      atk: 12,
    });
  });

  it("treats non-finite requests as zero", () => {
    expect(
      withStatPoints({ ...emptyStatsTable(), atk: 5 }, "atk", Number.NaN),
    ).toEqual(emptyStatsTable());
  });

  it("clamps negative requests to zero", () => {
    expect(withStatPoints(emptyStatsTable(), "atk", -3)).toEqual(
      emptyStatsTable(),
    );
  });

  it("returns the same table when nothing changes", () => {
    const table = { ...emptyStatsTable(), atk: 7 };
    expect(withStatPoints(table, "atk", 7)).toBe(table);
  });

  it("leaves the other stats alone", () => {
    expect(withStatPoints({ ...emptyStatsTable(), hp: 5 }, "atk", 3)).toEqual({
      ...emptyStatsTable(),
      hp: 5,
      atk: 3,
    });
  });
});
