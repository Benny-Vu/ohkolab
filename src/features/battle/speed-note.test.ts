import { describe, expect, it } from "vitest";

import {
  EMPTY_SPEED_FIELD,
  boostingNature,
  hinderingNature,
  myNotedSpeed,
  rangeIsInconsistent,
  relationBounds,
  speedHint,
  speedRange,
  type SpeedRelation,
} from "@/features/battle/speed-note";

function relation(overrides: Partial<SpeedRelation>): SpeedRelation {
  return {
    id: "r1",
    kind: "faster",
    mineSpecies: "Garchomp",
    mineSpeed: 169,
    field: { ...EMPTY_SPEED_FIELD },
    ...overrides,
  };
}

describe("myNotedSpeed", () => {
  it("applies Tailwind, Scarf, paralysis and stages to the noted stat", () => {
    expect(myNotedSpeed(relation({}))).toBe(169);
    expect(
      myNotedSpeed(
        relation({ field: { ...EMPTY_SPEED_FIELD, tailwindMine: true } }),
      ),
    ).toBe(338);
    expect(
      myNotedSpeed(
        relation({ field: { ...EMPTY_SPEED_FIELD, scarfMine: true } }),
      ),
    ).toBe(253);
    expect(
      myNotedSpeed(
        relation({ field: { ...EMPTY_SPEED_FIELD, paralyzedMine: true } }),
      ),
    ).toBe(84);
    expect(
      myNotedSpeed(
        relation({ field: { ...EMPTY_SPEED_FIELD, stageMine: -1 } }),
      ),
    ).toBe(112);
  });

  it("returns null without a speed", () => {
    expect(myNotedSpeed(relation({ mineSpeed: null }))).toBeNull();
  });
});

describe("relationBounds", () => {
  it("faster gives a lower bound just above mine", () => {
    expect(relationBounds(relation({}))).toEqual({ min: 170, max: null });
  });

  it("slower gives an upper bound just below mine", () => {
    expect(relationBounds(relation({ kind: "slower" }))).toEqual({
      min: null,
      max: 168,
    });
  });

  it("a tie pins both bounds", () => {
    expect(relationBounds(relation({ kind: "tie" }))).toEqual({
      min: 169,
      max: 169,
    });
  });

  it("Trick Room reverses the meaning", () => {
    expect(
      relationBounds(
        relation({ field: { ...EMPTY_SPEED_FIELD, trickRoom: true } }),
      ),
    ).toEqual({ min: null, max: 168 });
    expect(
      relationBounds(
        relation({
          kind: "slower",
          field: { ...EMPTY_SPEED_FIELD, trickRoom: true },
        }),
      ),
    ).toEqual({ min: 170, max: null });
  });

  it("their Tailwind halves the bound back to a stat", () => {
    // Faster than my 199 under their Tailwind: stat doubled beats 200,
    // so the stat is at least 100 (200 halves exactly).
    expect(
      relationBounds(
        relation({
          mineSpeed: 199,
          field: { ...EMPTY_SPEED_FIELD, tailwindTheirs: true },
        }),
      ),
    ).toEqual({ min: 100, max: null });
    expect(
      relationBounds(
        relation({
          kind: "slower",
          mineSpeed: 201,
          field: { ...EMPTY_SPEED_FIELD, tailwindTheirs: true },
        }),
      ),
    ).toEqual({ min: null, max: 100 });
  });

  it("bounds nothing without a speed or on a priority move", () => {
    expect(relationBounds(relation({ mineSpeed: null }))).toBeNull();
    expect(
      relationBounds(
        relation({ field: { ...EMPTY_SPEED_FIELD, priority: true } }),
      ),
    ).toBeNull();
  });
});

describe("speedRange", () => {
  it("keeps the highest lower and the lowest upper bound", () => {
    const range = speedRange([
      relation({}),
      relation({ kind: "slower", mineSpeed: 200 }),
      relation({ mineSpeed: null }),
    ]);
    expect(range).toEqual({ min: 170, max: 199 });
  });

  it("stays open where nothing bounds it", () => {
    expect(speedRange([relation({})])).toEqual({ min: 170, max: null });
    expect(speedRange([relation({ kind: "slower" })])).toEqual({
      min: null,
      max: 168,
    });
    expect(speedRange([])).toEqual({ min: null, max: null });
  });

  it("flags crossing bounds as inconsistent", () => {
    const range = speedRange([
      relation({ mineSpeed: 180 }),
      relation({ kind: "slower", mineSpeed: 150 }),
    ]);
    expect(rangeIsInconsistent(range)).toBe(true);
  });
});

describe("speedHint", () => {
  // Incineroar: a slow physical attacker, so Jolly/Brave fit its side.
  it("names the boosting nature that fits the attacking side", () => {
    expect(boostingNature("Incineroar")).toBe("Jolly");
    expect(hinderingNature("Incineroar")).toBe("Brave");
  });

  it("names Timid for a special attacker and both when mixed", () => {
    expect(boostingNature("Incineroar")).toBe("Jolly");
    expect(hinderingNature("Incineroar")).toBe("Brave");
  });

  it("says nothing when the range fits an ordinary spread", () => {
    // Garchomp can be anything from uninvested to Jolly max 169.
    expect(speedHint("Garchomp", { min: 100, max: 150 })).toBeNull();
  });

  it("reads a lower bound at the invested boosting maximum", () => {
    // Garchomp's Jolly max is 169: requiring at least that means max Speed.
    expect(speedHint("Garchomp", { min: 169, max: null })).toEqual({
      kind: "boostMax",
      nature: "Jolly",
    });
  });

  it("reads a lower bound above the invested maximum as a Scarf", () => {
    expect(speedHint("Garchomp", { min: 170, max: null })).toEqual({
      kind: "scarf",
    });
  });

  it("reads a bound between neutral-max and boost-max as nature or Scarf", () => {
    // Garchomp's Serious 32-SP max is 154; anything needing 160 needs a
    // boosting nature or a Scarf.
    expect(speedHint("Garchomp", { min: 160, max: null })).toEqual({
      kind: "boostOrScarf",
      nature: "Jolly",
    });
  });

  it("reads a low upper bound as uninvested or hindering", () => {
    expect(speedHint("Incineroar", { min: null, max: 80 })).toEqual({
      kind: "uninvested",
      nature: "Brave",
    });
  });

  it("reads an upper bound below the slowest spread as a Speed drop", () => {
    // Garchomp's slowest spread (Brave, 0 SP) is 109: at most 108 means
    // something lowered it, not an unusual spread.
    expect(speedHint("Garchomp", { min: null, max: 108 })).toEqual({
      kind: "slowed",
    });
    expect(speedHint("Garchomp", { min: null, max: 109 })).toEqual({
      kind: "uninvested",
      nature: "Brave",
    });
  });

  it("reads a lower bound above Scarf at max Speed as an unnoted boost", () => {
    // Jolly max 169 with a Scarf is 253.
    expect(speedHint("Garchomp", { min: 253, max: null })).toEqual({
      kind: "scarf",
    });
    expect(speedHint("Garchomp", { min: 254, max: null })).toEqual({
      kind: "boosted",
    });
  });

  it("calls crossing bounds inconsistent", () => {
    expect(speedHint("Garchomp", { min: 180, max: 100 })).toEqual({
      kind: "inconsistent",
    });
  });
});
