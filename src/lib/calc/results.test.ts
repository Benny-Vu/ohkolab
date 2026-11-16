import { describe, expect, it } from "vitest";

import { calculateDamage, createDefaultSet } from "@/data";
import {
  computeAllOutcomes,
  computeMoveOutcomes,
  outcomeRangeText,
  outcomeSummary,
  remainingHp,
  resolveSelection,
  type MoveOutcome,
} from "@/lib/calc/results";
import { calcReducer, createDefaultCalcState } from "@/lib/calc/state";
import { battlerFromSet, emptyField } from "@/types/battle";

/** The outcome at a position; fails the test when there is none. */
function at(outcomes: MoveOutcome[], index: number): MoveOutcome {
  const entry = outcomes[index];
  if (!entry) throw new Error(`No outcome at index ${index}`);
  return entry;
}

function outcome(patch: Partial<MoveOutcome>): MoveOutcome {
  return {
    slot: 0,
    move: "Earthquake",
    type: "Ground",
    category: "Physical",
    crit: false,
    kind: "damage",
    result: null,
    ...patch,
  };
}

describe("computeMoveOutcomes", () => {
  it("matches the damage function for each move of the attacker", () => {
    const state = createDefaultCalcState();
    const outcomes = computeMoveOutcomes(state, "singles", "p1");
    expect(outcomes.map((entry) => entry.move)).toEqual([
      "Earthquake",
      "Dragon Claw",
      "Rock Slide",
      "Protect",
    ]);

    const expected = calculateDamage(
      battlerFromSet(state.sides.p1.set),
      battlerFromSet(state.sides.p2.set),
      "Earthquake",
      emptyField("singles"),
    );
    expect(outcomes[0]).toEqual({
      slot: 0,
      move: "Earthquake",
      type: "Ground",
      category: "Physical",
      crit: false,
      kind: "damage",
      result: expected,
    });
    expect(expected.max).toBeGreaterThan(0);
  });

  it("calculates the other direction with the sides reversed", () => {
    const state = createDefaultCalcState();
    const flareBlitz = at(computeMoveOutcomes(state, "singles", "p2"), 0);
    expect(flareBlitz.move).toBe("Flare Blitz");
    expect(flareBlitz.result?.description).toContain("Incineroar Flare Blitz");
    expect(flareBlitz.result?.description).toContain("Garchomp");
  });

  it("marks status moves without calculating them", () => {
    const outcomes = computeMoveOutcomes(
      createDefaultCalcState(),
      "doubles",
      "p1",
    );
    expect(outcomes[3]).toMatchObject({
      slot: 3,
      move: "Protect",
      kind: "status",
      category: "Status",
      result: null,
    });
  });

  it("reports immunities as no damage", () => {
    const state = calcReducer(createDefaultCalcState(), {
      type: "setSet",
      side: "p2",
      set: createDefaultSet("Charizard"),
    });
    const earthquake = at(computeMoveOutcomes(state, "singles", "p1"), 0);
    expect(earthquake.kind).toBe("none");
    expect(earthquake.result).toMatchObject({ min: 0, max: 0 });
  });

  it("skips empty slots but keeps slot numbers", () => {
    const start = createDefaultCalcState();
    const state = calcReducer(start, {
      type: "setSet",
      side: "p1",
      set: {
        ...start.sides.p1.set,
        moves: [null, "Dragon Claw", null, "Rock Slide"],
      },
    });
    expect(
      computeMoveOutcomes(state, "singles", "p1").map((entry) => [
        entry.slot,
        entry.move,
      ]),
    ).toEqual([
      [1, "Dragon Claw"],
      [3, "Rock Slide"],
    ]);

    const empty = calcReducer(start, {
      type: "setSet",
      side: "p1",
      set: { ...start.sides.p1.set, moves: [null, null, null, null] },
    });
    expect(computeMoveOutcomes(empty, "singles", "p1")).toEqual([]);
  });

  it("does not throw for names the calc does not know", () => {
    const start = createDefaultCalcState();
    const unknownMove = calcReducer(start, {
      type: "setSet",
      side: "p1",
      set: {
        ...start.sides.p1.set,
        moves: ["Not A Move", "Earthquake", null, null],
      },
    });
    const outcomes = computeMoveOutcomes(unknownMove, "singles", "p1");
    expect(outcomes[0]).toMatchObject({
      move: "Not A Move",
      kind: "error",
      type: null,
      result: null,
    });
    expect(at(outcomes, 1).kind).toBe("damage");

    const unknownSpecies = calcReducer(start, {
      type: "setSet",
      side: "p2",
      set: { ...createDefaultSet("Garchomp"), species: "Missingno" },
    });
    const against = computeMoveOutcomes(unknownSpecies, "singles", "p1");
    expect(at(against, 0).kind).toBe("error");
    expect(at(against, 3).kind).toBe("status");
  });

  it("applies the critical-hit toggle of the slot", () => {
    const start = createDefaultCalcState();
    const crit = calcReducer(start, {
      type: "setCrit",
      side: "p1",
      slot: 1,
      on: true,
    });
    const normal = computeMoveOutcomes(start, "singles", "p1");
    const withCrit = computeMoveOutcomes(crit, "singles", "p1");
    expect(at(withCrit, 1).crit).toBe(true);
    expect(at(withCrit, 1).result!.max).toBeGreaterThan(
      at(normal, 1).result!.max,
    );
    expect(at(withCrit, 0).result).toEqual(at(normal, 0).result);
  });

  it("applies stages, status and current HP", () => {
    const start = createDefaultCalcState();
    const base = at(computeMoveOutcomes(start, "singles", "p1"), 1).result!;

    const boosted = calcReducer(start, {
      type: "setBoost",
      side: "p1",
      stat: "atk",
      value: 2,
    });
    expect(
      at(computeMoveOutcomes(boosted, "singles", "p1"), 1).result!.max,
    ).toBeGreaterThan(base.max);

    const burned = calcReducer(start, {
      type: "setStatus",
      side: "p1",
      status: "brn",
    });
    expect(
      at(computeMoveOutcomes(burned, "singles", "p1"), 1).result!.max,
    ).toBeLessThan(base.max);

    const hurt = calcReducer(start, {
      type: "setHpPercent",
      side: "p2",
      value: 5,
    });
    expect(
      at(computeMoveOutcomes(hurt, "singles", "p1"), 1).result!.koText,
    ).toContain("guaranteed OHKO");
  });

  it("applies the field: format, weather and each side's conditions", () => {
    const start = createDefaultCalcState();
    const singles = computeMoveOutcomes(start, "singles", "p1");
    const doubles = computeMoveOutcomes(start, "doubles", "p1");
    // Earthquake is a spread move.
    expect(at(doubles, 0).result!.max).toBeLessThan(at(singles, 0).result!.max);

    const reflect = calcReducer(start, {
      type: "setSideFlag",
      side: "p2",
      flag: "reflect",
      on: true,
    });
    expect(
      at(computeMoveOutcomes(reflect, "singles", "p1"), 1).result!.max,
    ).toBeLessThan(at(singles, 1).result!.max);
    // Reflect on Pokémon 2's side does nothing for Pokémon 1.
    expect(computeMoveOutcomes(reflect, "singles", "p2")).toEqual(
      computeMoveOutcomes(start, "singles", "p2"),
    );

    const rain = calcReducer(start, { type: "setWeather", weather: "Rain" });
    expect(
      at(computeMoveOutcomes(rain, "singles", "p2"), 0).result!.max,
    ).toBeLessThan(
      at(computeMoveOutcomes(start, "singles", "p2"), 0).result!.max,
    );

    const helpingHand = calcReducer(start, {
      type: "setSideFlag",
      side: "p1",
      flag: "helpingHand",
      on: true,
    });
    expect(
      at(computeMoveOutcomes(helpingHand, "doubles", "p1"), 1).result!.max,
    ).toBeGreaterThan(at(doubles, 1).result!.max);
    expect(computeMoveOutcomes(helpingHand, "singles", "p1")).toEqual(singles);
  });

  it("calculates with the Mega forme when Mega Evolved", () => {
    const start = createDefaultCalcState();
    const mega = calcReducer(start, {
      type: "setSet",
      side: "p1",
      set: { ...start.sides.p1.set, item: "Garchompite" },
    });
    const megaResult = at(
      computeMoveOutcomes(mega, "singles", "p1"),
      1,
    ).result!;
    expect(megaResult.description).toContain("Garchomp-Mega Dragon Claw");

    const unevolved = calcReducer(mega, {
      type: "setMega",
      side: "p1",
      on: false,
    });
    const baseResult = at(
      computeMoveOutcomes(unevolved, "singles", "p1"),
      1,
    ).result!;
    expect(baseResult.description).not.toContain("Garchomp-Mega");
    expect(megaResult.max).toBeGreaterThan(baseResult.max);

    // The Mega forme also defends with its own stats.
    const intoMega = at(computeMoveOutcomes(mega, "singles", "p2"), 1).result!;
    expect(intoMega.description).toContain("Garchomp-Mega");
  });
});

describe("computeAllOutcomes", () => {
  it("holds both directions", () => {
    const state = createDefaultCalcState();
    expect(computeAllOutcomes(state, "doubles")).toEqual({
      p1: computeMoveOutcomes(state, "doubles", "p1"),
      p2: computeMoveOutcomes(state, "doubles", "p2"),
    });
  });
});

describe("resolveSelection", () => {
  const outcomes = {
    p1: [outcome({ slot: 1, move: "Dragon Claw" }), outcome({ slot: 3 })],
    p2: [outcome({ slot: 0, move: "Flare Blitz" })],
  };

  it("returns the selected move", () => {
    expect(resolveSelection({ side: "p1", slot: 3 }, outcomes)).toEqual({
      side: "p1",
      outcome: outcomes.p1[1],
    });
    expect(resolveSelection({ side: "p2", slot: 0 }, outcomes)).toEqual({
      side: "p2",
      outcome: outcomes.p2[0],
    });
  });

  it("falls back to the side's first move when the slot is empty", () => {
    expect(resolveSelection({ side: "p1", slot: 0 }, outcomes)).toEqual({
      side: "p1",
      outcome: outcomes.p1[0],
    });
  });

  it("falls back to the other side, then to nothing", () => {
    expect(
      resolveSelection({ side: "p1", slot: 0 }, { p1: [], p2: outcomes.p2 }),
    ).toEqual({ side: "p2", outcome: outcomes.p2[0] });
    expect(
      resolveSelection({ side: "p2", slot: 2 }, { p1: outcomes.p1, p2: [] }),
    ).toEqual({ side: "p1", outcome: outcomes.p1[0] });
    expect(
      resolveSelection({ side: "p1", slot: 0 }, { p1: [], p2: [] }),
    ).toBeNull();
  });
});

describe("outcome text", () => {
  const result = {
    move: "Earthquake",
    min: 90,
    max: 107,
    minPercent: 44.6,
    maxPercent: 53,
    defenderMaxHp: 202,
    rolls: null,
    description: "",
    koText: "22.3% chance to 2HKO",
  };

  it("formats a damage range and its KO text", () => {
    const damage = outcome({ result });
    expect(outcomeRangeText(damage)).toBe("44.6 - 53%");
    expect(outcomeSummary(damage)).toBe("22.3% chance to 2HKO");
  });

  it("shows a single figure for fixed damage and a fallback KO text", () => {
    const fixed = outcome({
      result: { ...result, minPercent: 24.8, maxPercent: 24.8, koText: "" },
    });
    expect(outcomeRangeText(fixed)).toBe("24.8%");
    expect(outcomeSummary(fixed)).toBe("Not a KO");
  });

  it("describes immunities, status moves and failures", () => {
    const none = outcome({ kind: "none", result: { ...result, max: 0 } });
    expect(outcomeRangeText(none)).toBe("0%");
    expect(outcomeSummary(none)).toBe("No effect");

    const status = outcome({ kind: "status" });
    expect(outcomeRangeText(status)).toBe("–");
    expect(outcomeSummary(status)).toBe("Status move");

    const error = outcome({ kind: "error" });
    expect(outcomeRangeText(error)).toBe("–");
    expect(outcomeSummary(error)).toBe("Cannot be calculated");
  });
});

describe("remainingHp", () => {
  it("gives the HP range left after the hit, in HP and percent", () => {
    expect(remainingHp({ min: 90, max: 107, defenderMaxHp: 202 }, 100)).toEqual(
      {
        current: 202,
        max: 202,
        minRemaining: 95,
        maxRemaining: 112,
        currentPercent: 100,
        minPercent: 47,
        maxPercent: 55.4,
      },
    );
  });

  it("starts from the current HP and never goes below zero", () => {
    expect(remainingHp({ min: 90, max: 107, defenderMaxHp: 202 }, 50)).toEqual({
      current: 101,
      max: 202,
      minRemaining: 0,
      maxRemaining: 11,
      currentPercent: 50,
      minPercent: 0,
      maxPercent: 5.4,
    });
    expect(
      remainingHp({ min: 300, max: 350, defenderMaxHp: 202 }, 100),
    ).toMatchObject({ minRemaining: 0, maxRemaining: 0, maxPercent: 0 });
  });

  it("keeps at least 1 HP before the hit, like the damage function", () => {
    expect(
      remainingHp({ min: 0, max: 0, defenderMaxHp: 202 }, 0),
    ).toMatchObject({ current: 2, minRemaining: 2, maxRemaining: 2 });
    expect(remainingHp({ min: 0, max: 0, defenderMaxHp: 40 }, 1)).toMatchObject(
      {
        current: 1,
      },
    );
  });
});
