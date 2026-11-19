import { describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import {
  applySetChange,
  computeSecondOutcomes,
} from "@/features/calc/second-defender";
import { computeMoveOutcomes } from "@/lib/calc/results";
import {
  createDefaultCalcState,
  createSide,
  type CalcSide,
} from "@/lib/calc/state";
import type { PokemonSet } from "@/types/pokemon";

function garchompSet(): PokemonSet {
  return {
    ...createDefaultSet("Garchomp"),
    ability: "Rough Skin",
    nature: "Jolly",
    statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
    moves: ["Earthquake", "Dragon Claw", "Rock Slide", "Protect"],
  };
}

describe("applySetChange", () => {
  it("starts fresh on a different species", () => {
    const used: CalcSide = {
      ...createSide(garchompSet()),
      boosts: { atk: 2, def: 0, spa: 0, spd: 0, spe: 0 },
      status: "brn",
      hpPercent: 50,
    };
    const next = applySetChange(used, createDefaultSet("Charizard"));

    expect(next).toEqual(createSide(createDefaultSet("Charizard")));
  });

  it("keeps the battle state on the same species", () => {
    const side = createSide(garchompSet());
    const boosted = { ...side, boosts: { ...side.boosts, atk: 2 } };
    const next = applySetChange(boosted, {
      ...side.set,
      item: "Life Orb",
    });

    expect(next.boosts.atk).toBe(2);
    expect(next.set.item).toBe("Life Orb");
  });

  it("switches Mega Evolution with the Mega Stone", () => {
    const side = createSide(garchompSet());
    expect(side.mega).toBe(false);

    const withStone = applySetChange(side, {
      ...side.set,
      item: "Garchompite",
    });
    expect(withStone.mega).toBe(true);

    const withoutStone = applySetChange(withStone, {
      ...withStone.set,
      item: null,
    });
    expect(withoutStone.mega).toBe(false);
  });
});

describe("computeSecondOutcomes", () => {
  it("mirrors the attacker's move slots against the second defender", () => {
    const state = createDefaultCalcState();
    const second = createSide(createDefaultSet("Charizard"));

    const outcomes = computeSecondOutcomes(state, "doubles", second);

    expect(outcomes.map((outcome) => outcome.slot)).toEqual([0, 1, 2, 3]);
    // Charizard is immune to Earthquake, weak to Rock Slide; Protect is status.
    expect(outcomes[0]).toMatchObject({ move: "Earthquake", kind: "none" });
    expect(outcomes[1]).toMatchObject({
      move: "Dragon Claw",
      kind: "damage",
    });
    expect(outcomes[2]).toMatchObject({ move: "Rock Slide", kind: "damage" });
    expect(outcomes[3]).toMatchObject({ move: "Protect", kind: "status" });
    const dragonClaw = outcomes.find(
      (outcome) => outcome.move === "Dragon Claw",
    );
    expect(dragonClaw?.result?.max).toBeGreaterThan(0);
  });

  it("applies the spread reduction to the second defender in doubles", () => {
    const state = createDefaultCalcState();
    const second = createSide(createDefaultSet("Incineroar"));

    const singles = computeSecondOutcomes(state, "singles", second);
    const doubles = computeSecondOutcomes(state, "doubles", second);
    const quakeSingles = singles.find((o) => o.move === "Earthquake")?.result;
    const quakeDoubles = doubles.find((o) => o.move === "Earthquake")?.result;

    expect(quakeSingles && quakeDoubles).toBeTruthy();
    if (quakeSingles && quakeDoubles) {
      expect(Math.abs(quakeDoubles.max / quakeSingles.max - 0.75)).toBeLessThan(
        0.02,
      );
    }
  });

  it("shares the defender's side of the field", () => {
    const state = createDefaultCalcState();
    const second = createSide(createDefaultSet("Incineroar"));

    // Reflect sits on the defenders' side (p2 in the state), so it must cut
    // the damage into the second defender as well.
    const plain = computeSecondOutcomes(state, "singles", second);
    const screened = computeSecondOutcomes(
      {
        ...state,
        fieldSides: {
          ...state.fieldSides,
          p2: { ...state.fieldSides.p2, reflect: true },
        },
      },
      "singles",
      second,
    );

    const before = plain.find((o) => o.move === "Earthquake")?.result;
    const after = screened.find((o) => o.move === "Earthquake")?.result;
    expect(before && after).toBeTruthy();
    if (before && after) {
      expect(Math.abs(after.max / before.max - 0.5)).toBeLessThan(0.02);
    }
  });

  it("matches the main outcomes for the same defender", () => {
    const state = createDefaultCalcState();
    // The second defender as a copy of p2: its outcomes must equal p1's main
    // outcomes against p2, roll for roll.
    const second = createSide(state.sides.p2.set);
    const main = computeMoveOutcomes(state, "doubles", "p1");
    const mirror = computeSecondOutcomes(state, "doubles", second);

    expect(
      mirror.map((outcome) => [
        outcome.slot,
        outcome.kind,
        outcome.result?.min,
        outcome.result?.max,
      ]),
    ).toEqual(
      main.map((outcome) => [
        outcome.slot,
        outcome.kind,
        outcome.result?.min,
        outcome.result?.max,
      ]),
    );
  });
});
