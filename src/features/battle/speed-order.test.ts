import { describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import type { PokemonSet } from "@/types/pokemon";
import {
  EMPTY_SPEED_TOGGLES,
  orderSpeedRows,
  speedRows,
  type SpeedMember,
} from "@/features/battle/speed-order";

function member(
  key: string,
  species: string,
  side: "mine" | "theirs",
  set?: Partial<PokemonSet>,
): SpeedMember {
  return {
    key,
    name: species,
    species,
    side,
    set: { ...createDefaultSet(species), ...set },
  };
}

/** Garchomp is faster than Incineroar at every investment. */
const GARCHOMP = member("my-0", "Garchomp", "mine");
const INCINEROAR = member("their-0", "Incineroar", "theirs");

describe("speedRows", () => {
  it("shows the unmodified Speed stat before any toggle", () => {
    const [row] = speedRows([GARCHOMP], EMPTY_SPEED_TOGGLES);
    expect(row?.final).toBe(row?.base);
    expect(row?.scarf).toBe(false);
    expect(row?.tailwind).toBe(false);
  });

  it("doubles the side under Tailwind and applies the scarf toggle", () => {
    const rows = speedRows([GARCHOMP, INCINEROAR], {
      ...EMPTY_SPEED_TOGGLES,
      myTailwind: true,
      scarves: { "their-0": true },
    });
    const mine = rows.find((row) => row.key === "my-0");
    const theirs = rows.find((row) => row.key === "their-0");
    expect(mine?.tailwind).toBe(true);
    expect(mine?.final).toBe((mine?.base ?? 0) * 2);
    expect(theirs?.scarf).toBe(true);
    expect(theirs?.final).toBe(Math.floor(((theirs?.base ?? 0) * 3) / 2));
  });

  it("treats a held Choice Scarf as a scarf even without the toggle", () => {
    const scarfHolder = member("my-0", "Incineroar", "mine", {
      item: "Choice Scarf",
    });
    const [row] = speedRows([scarfHolder], EMPTY_SPEED_TOGGLES);
    expect(row?.scarf).toBe(true);
    expect(row?.final).toBe(Math.floor(((row?.base ?? 0) * 3) / 2));
  });

  it("keeps Tailwind per side", () => {
    const rows = speedRows([GARCHOMP, INCINEROAR], {
      ...EMPTY_SPEED_TOGGLES,
      theirTailwind: true,
    });
    expect(rows.find((row) => row.key === "my-0")?.tailwind).toBe(false);
    expect(rows.find((row) => row.key === "their-0")?.tailwind).toBe(true);
  });
});

describe("orderSpeedRows", () => {
  it("lists the fastest first", () => {
    const ordered = orderSpeedRows(
      speedRows([INCINEROAR, GARCHOMP], EMPTY_SPEED_TOGGLES),
      false,
    );
    expect(ordered.map((row) => row.key)).toEqual(["my-0", "their-0"]);
  });

  it("reverses under Trick Room, keeping ties in their input order", () => {
    const rows = speedRows(
      [GARCHOMP, INCINEROAR, member("my-1", "Garchomp", "mine")],
      EMPTY_SPEED_TOGGLES,
    );
    // The two Garchomp tie: their input order survives both directions.
    expect(orderSpeedRows(rows, false).map((row) => row.key)).toEqual([
      "my-0",
      "my-1",
      "their-0",
    ]);
    expect(orderSpeedRows(rows, true).map((row) => row.key)).toEqual([
      "their-0",
      "my-0",
      "my-1",
    ]);
  });

  it("re-orders live when a toggle changes the speeds", () => {
    const withoutTailwind = orderSpeedRows(
      speedRows([INCINEROAR, GARCHOMP], EMPTY_SPEED_TOGGLES),
      false,
    );
    const withTheirTailwind = orderSpeedRows(
      speedRows([INCINEROAR, GARCHOMP], {
        ...EMPTY_SPEED_TOGGLES,
        theirTailwind: true,
      }),
      false,
    );
    expect(withoutTailwind[0]?.key).toBe("my-0");
    expect(withTheirTailwind[0]?.key).toBe("their-0");
  });
});
