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

  it("carries a noted range on their side only, when it bounds anything", () => {
    const rows = speedRows([GARCHOMP, INCINEROAR], EMPTY_SPEED_TOGGLES, {
      Incineroar: { min: 100, max: null },
    });
    expect(rows.find((row) => row.key === "their-0")?.range).toEqual({
      min: 100,
      max: null,
    });
    expect(rows.find((row) => row.key === "my-0")?.range).toBeUndefined();

    const open = speedRows([INCINEROAR], EMPTY_SPEED_TOGGLES, {
      Incineroar: { min: null, max: null },
    });
    expect(open[0]?.range).toBeUndefined();
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

  it("sorts a banded opponent by the range bound, not the guess", () => {
    // Noted "at least 500": the band places it above the guess however
    // fast the guessed set looks.
    const fast = speedRows([GARCHOMP, INCINEROAR], EMPTY_SPEED_TOGGLES, {
      Incineroar: { min: 500, max: null },
    });
    expect(orderSpeedRows(fast, false).map((row) => row.key)).toEqual([
      "their-0",
      "my-0",
    ]);

    // Noted "at most 5": slow, even with the scarf toggle on the guess.
    const slow = speedRows(
      [GARCHOMP, INCINEROAR],
      { ...EMPTY_SPEED_TOGGLES, scarves: { "their-0": true } },
      { Incineroar: { min: null, max: 5 } },
    );
    expect(orderSpeedRows(slow, false).map((row) => row.key)).toEqual([
      "my-0",
      "their-0",
    ]);
  });

  it("ignores a range the notes contradict and sorts by the guess", () => {
    const rows = speedRows([GARCHOMP, INCINEROAR], EMPTY_SPEED_TOGGLES, {
      Incineroar: { min: 900, max: 1 },
    });
    expect(orderSpeedRows(rows, false).map((row) => row.key)).toEqual([
      "my-0",
      "their-0",
    ]);
  });
});
