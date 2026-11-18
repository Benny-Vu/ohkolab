import { describe, expect, it } from "vitest";

import { calcStats, createDefaultSet } from "@/data";
import {
  applyStage,
  fasterSide,
  finalSpeed,
  sideSpeed,
} from "@/lib/calc/speed";
import {
  calcReducer,
  createDefaultCalcState,
  type CalcAction,
  type CalcState,
} from "@/lib/calc/state";

function reduce(state: CalcState, ...actions: CalcAction[]): CalcState {
  return actions.reduce(calcReducer, state);
}

describe("applyStage", () => {
  it("multiplies by (2+n)/2 when raised", () => {
    expect(applyStage(100, 0)).toBe(100);
    expect(applyStage(100, 1)).toBe(150);
    expect(applyStage(100, 2)).toBe(200);
    expect(applyStage(100, 6)).toBe(400);
    expect(applyStage(169, 1)).toBe(253);
  });

  it("multiplies by 2/(2+n) when lowered, rounding down", () => {
    expect(applyStage(100, -1)).toBe(66);
    expect(applyStage(100, -2)).toBe(50);
    expect(applyStage(100, -6)).toBe(25);
    expect(applyStage(169, -1)).toBe(112);
  });

  it("treats stages beyond the limits as the limits", () => {
    expect(applyStage(100, 9)).toBe(400);
    expect(applyStage(100, -9)).toBe(25);
  });
});

describe("finalSpeed", () => {
  it("is the stat when nothing applies", () => {
    expect(finalSpeed({ stat: 169 })).toBe(169);
  });

  it("applies Tailwind, Choice Scarf and paralysis", () => {
    expect(finalSpeed({ stat: 169, tailwind: true })).toBe(338);
    expect(finalSpeed({ stat: 169, choiceScarf: true })).toBe(253);
    expect(finalSpeed({ stat: 169, paralyzed: true })).toBe(84);
    expect(finalSpeed({ stat: 100, stage: 1 })).toBe(150);
  });

  it("rounds a Choice Scarf product down at exactly one half", () => {
    // 101 * 1.5 = 151.5
    expect(finalSpeed({ stat: 101, choiceScarf: true })).toBe(151);
  });

  it("combines stage, Tailwind, Choice Scarf and paralysis in order", () => {
    // 169 at +1 = 253; x2 x1.5 = 759; halved = 379.
    expect(
      finalSpeed({
        stat: 169,
        stage: 1,
        tailwind: true,
        choiceScarf: true,
        paralyzed: true,
      }),
    ).toBe(379);
    // 80 at -1 = 53; x2 = 106.
    expect(finalSpeed({ stat: 80, stage: -1, tailwind: true })).toBe(106);
  });

  it("applies ability and item modifiers", () => {
    expect(finalSpeed({ stat: 100, abilityDoubles: true })).toBe(200);
    expect(
      finalSpeed({ stat: 100, abilityDoubles: true, tailwind: true }),
    ).toBe(400);
    expect(finalSpeed({ stat: 100, ironBall: true })).toBe(50);
    // The Scarf wins over the Iron Ball; a Pokémon holds only one item anyway.
    expect(finalSpeed({ stat: 100, ironBall: true, choiceScarf: true })).toBe(
      150,
    );
  });

  it("lets Quick Feet ignore the paralysis drop", () => {
    expect(finalSpeed({ stat: 100, quickFeet: true, paralyzed: true })).toBe(
      150,
    );
  });
});

describe("sideSpeed", () => {
  it("reads the Speed stat of the default Pokémon", () => {
    const state = createDefaultCalcState();
    const p1 = sideSpeed(state, "p1");
    expect(p1).toEqual({
      stat: calcStats(state.sides.p1.set).spe,
      final: calcStats(state.sides.p1.set).spe,
      modifiers: [],
    });
    expect(p1.stat).toBe(169);
  });

  it("includes stages, Tailwind, paralysis and Choice Scarf", () => {
    const start = createDefaultCalcState();
    const state = reduce(
      start,
      {
        type: "setSet",
        side: "p1",
        set: { ...start.sides.p1.set, item: "Choice Scarf" },
      },
      { type: "setBoost", side: "p1", stat: "spe", value: 1 },
      { type: "setSideFlag", side: "p1", flag: "tailwind", on: true },
      { type: "setStatus", side: "p1", status: "par" },
    );
    expect(sideSpeed(state, "p1")).toEqual({
      stat: 169,
      final: 379,
      modifiers: ["+1", "Tailwind", "Choice Scarf", "paralysis"],
    });
    // The other side has its own Tailwind and status.
    expect(sideSpeed(state, "p2").modifiers).toEqual([]);
  });

  it("shows a lowered stage with its sign", () => {
    const state = calcReducer(createDefaultCalcState(), {
      type: "setBoost",
      side: "p2",
      stat: "spe",
      value: -1,
    });
    const speed = sideSpeed(state, "p2");
    expect(speed.modifiers).toEqual(["-1"]);
    expect(speed.final).toBe(applyStage(speed.stat, -1));
  });

  it("uses the Mega forme's Speed when Mega Evolved", () => {
    const start = createDefaultCalcState();
    const state = calcReducer(start, {
      type: "setSet",
      side: "p1",
      set: { ...start.sides.p1.set, item: "Garchompite" },
    });
    const mega = sideSpeed(state, "p1");
    expect(mega.stat).toBe(
      calcStats({ ...state.sides.p1.set, species: "Garchomp-Mega" }).spe,
    );
    expect(mega.stat).toBeLessThan(169);

    const base = calcReducer(state, { type: "setMega", side: "p1", on: false });
    expect(sideSpeed(base, "p1").stat).toBe(169);
  });

  it("doubles Speed for a weather ability only under its weather", () => {
    const set = { ...createDefaultSet("Pelipper"), ability: "Swift Swim" };
    const dry = calcReducer(createDefaultCalcState(), {
      type: "setSet",
      side: "p1",
      set,
    });
    const stat = calcStats(set).spe;
    expect(sideSpeed(dry, "p1")).toEqual({ stat, final: stat, modifiers: [] });

    const rain = calcReducer(dry, { type: "setWeather", weather: "Rain" });
    expect(sideSpeed(rain, "p1")).toEqual({
      stat,
      final: stat * 2,
      modifiers: ["Swift Swim"],
    });

    const sun = calcReducer(dry, { type: "setWeather", weather: "Sun" });
    expect(sideSpeed(sun, "p1").final).toBe(stat);
  });
});

describe("fasterSide", () => {
  it("names the faster side or a tie", () => {
    expect(fasterSide({ p1: 169, p2: 80 })).toBe("p1");
    expect(fasterSide({ p1: 80, p2: 169 })).toBe("p2");
    expect(fasterSide({ p1: 100, p2: 100 })).toBe("tie");
  });

  it("names the slower side under Trick Room, keeping ties", () => {
    expect(fasterSide({ p1: 169, p2: 80 }, true)).toBe("p2");
    expect(fasterSide({ p1: 80, p2: 169 }, true)).toBe("p1");
    expect(fasterSide({ p1: 100, p2: 100 }, true)).toBe("tie");
  });
});
