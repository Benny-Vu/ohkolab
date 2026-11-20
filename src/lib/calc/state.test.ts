import { describe, expect, it } from "vitest";

import { createDefaultSet, validateSet } from "@/data";
import {
  calcReducer,
  createDefaultCalcState,
  createSide,
  megaFormeOf,
  otherSide,
  SIDE_IDS,
  type CalcAction,
  type CalcState,
} from "@/lib/calc/state";
import { emptyBoosts, emptySide } from "@/types/battle";

function reduce(state: CalcState, ...actions: CalcAction[]): CalcState {
  return actions.reduce(calcReducer, state);
}

describe("default state", () => {
  it("starts with two legal Pokémon that have moves", () => {
    const state = createDefaultCalcState();
    for (const id of SIDE_IDS) {
      const side = state.sides[id];
      expect(validateSet(side.set)).toEqual([]);
      expect(side.set.moves.every((move) => move !== null)).toBe(true);
      expect(side).toMatchObject({
        boosts: emptyBoosts(),
        status: null,
        hpPercent: 100,
        mega: false,
        crits: [false, false, false, false],
      });
      expect(state.fieldSides[id]).toEqual(emptySide());
    }
    expect(state.sides.p1.set.species).not.toBe(state.sides.p2.set.species);
    expect(state).toMatchObject({
      weather: null,
      terrain: null,
      gravity: false,
      trickRoom: false,
      selected: { side: "p1", slot: 0 },
    });
  });

  it("builds a fresh object every time", () => {
    const first = createDefaultCalcState();
    first.sides.p1.boosts.atk = 3;
    expect(createDefaultCalcState().sides.p1.boosts.atk).toBe(0);
  });
});

describe("helpers", () => {
  it("names the other side", () => {
    expect(otherSide("p1")).toBe("p2");
    expect(otherSide("p2")).toBe("p1");
  });

  it("finds the Mega forme only for a species' own stone", () => {
    expect(megaFormeOf({ species: "Garchomp", item: "Garchompite" })).toBe(
      "Garchomp-Mega",
    );
    expect(megaFormeOf({ species: "Charizard", item: "Charizardite Y" })).toBe(
      "Charizard-Mega-Y",
    );
    expect(megaFormeOf({ species: "Garchomp", item: "Life Orb" })).toBeNull();
    expect(megaFormeOf({ species: "Garchomp", item: null })).toBeNull();
    expect(megaFormeOf({ species: "Incineroar", item: "Garchompite" })).toBe(
      null,
    );
  });
});

describe("calcReducer: Pokémon", () => {
  it("keeps battle state when the same species is edited", () => {
    const start = reduce(
      createDefaultCalcState(),
      { type: "setBoost", side: "p1", stat: "atk", value: 2 },
      { type: "setStatus", side: "p1", status: "brn" },
      { type: "setHpPercent", side: "p1", value: 40 },
      { type: "setCrit", side: "p1", slot: 1, on: true },
    );
    const edited = { ...start.sides.p1.set, nature: "Adamant" };
    const next = calcReducer(start, {
      type: "setSet",
      side: "p1",
      set: edited,
    });

    expect(next.sides.p1).toMatchObject({
      set: edited,
      boosts: { ...emptyBoosts(), atk: 2 },
      status: "brn",
      hpPercent: 40,
      crits: [false, true, false, false],
    });
    expect(next.sides.p2).toBe(start.sides.p2);
  });

  it("starts fresh when the species changes", () => {
    const start = reduce(
      createDefaultCalcState(),
      { type: "setBoost", side: "p2", stat: "spe", value: -1 },
      { type: "setStatus", side: "p2", status: "par" },
      { type: "setHpPercent", side: "p2", value: 12 },
      { type: "setCrit", side: "p2", slot: 0, on: true },
    );
    const set = createDefaultSet("Dragonite");
    const next = calcReducer(start, { type: "setSet", side: "p2", set });
    expect(next.sides.p2).toEqual(createSide(set));
    expect(next.sides.p2.hpPercent).toBe(100);
  });

  it("clamps stages to -6..+6 and HP to 1..100", () => {
    const state = reduce(
      createDefaultCalcState(),
      { type: "setBoost", side: "p1", stat: "atk", value: 9 },
      { type: "setBoost", side: "p1", stat: "def", value: -9 },
      { type: "setBoost", side: "p1", stat: "spe", value: 1.6 },
      { type: "setHpPercent", side: "p1", value: 250 },
      { type: "setHpPercent", side: "p2", value: 0 },
    );
    expect(state.sides.p1.boosts).toEqual({
      atk: 6,
      def: -6,
      spa: 0,
      spd: 0,
      spe: 2,
    });
    expect(state.sides.p1.hpPercent).toBe(100);
    expect(state.sides.p2.hpPercent).toBe(1);
    expect(
      calcReducer(state, { type: "setHpPercent", side: "p2", value: NaN }).sides
        .p2.hpPercent,
    ).toBe(1);
  });

  it("clears stages and sets status", () => {
    const state = reduce(
      createDefaultCalcState(),
      { type: "setBoost", side: "p1", stat: "atk", value: 2 },
      { type: "setStatus", side: "p1", status: "par" },
      { type: "clearBoosts", side: "p1" },
    );
    expect(state.sides.p1.boosts).toEqual(emptyBoosts());
    expect(state.sides.p1.status).toBe("par");
    expect(
      calcReducer(state, { type: "setStatus", side: "p1", status: null }).sides
        .p1.status,
    ).toBeNull();
  });
});

describe("calcReducer: Mega Evolution", () => {
  const withStone = (state: CalcState) =>
    calcReducer(state, {
      type: "setSet",
      side: "p1",
      set: { ...state.sides.p1.set, item: "Garchompite" },
    });

  it("switches on when the Mega Stone is picked up and off when it is dropped", () => {
    const start = createDefaultCalcState();
    expect(start.sides.p1.mega).toBe(false);

    const holding = withStone(start);
    expect(holding.sides.p1.mega).toBe(true);

    const dropped = calcReducer(holding, {
      type: "setSet",
      side: "p1",
      set: { ...holding.sides.p1.set, item: "Life Orb" },
    });
    expect(dropped.sides.p1.mega).toBe(false);
  });

  it("keeps the switch as the user left it while the stone stays", () => {
    const off = calcReducer(withStone(createDefaultCalcState()), {
      type: "setMega",
      side: "p1",
      on: false,
    });
    expect(off.sides.p1.mega).toBe(false);

    const edited = calcReducer(off, {
      type: "setSet",
      side: "p1",
      set: { ...off.sides.p1.set, nature: "Adamant" },
    });
    expect(edited.sides.p1.mega).toBe(false);
    expect(
      calcReducer(edited, { type: "setMega", side: "p1", on: true }).sides.p1
        .mega,
    ).toBe(true);
  });

  it("cannot be switched on without a Mega Stone", () => {
    const state = calcReducer(createDefaultCalcState(), {
      type: "setMega",
      side: "p1",
      on: true,
    });
    expect(state.sides.p1.mega).toBe(false);
  });
});

describe("calcReducer: moves", () => {
  it("toggles critical hits per slot and ignores bad slots", () => {
    const start = createDefaultCalcState();
    const state = reduce(
      start,
      { type: "setCrit", side: "p2", slot: 3, on: true },
      { type: "setCrit", side: "p2", slot: 7, on: true },
    );
    expect(state.sides.p2.crits).toEqual([false, false, false, true]);
    expect(state.sides.p1.crits).toEqual([false, false, false, false]);
    expect(start.sides.p2.crits).toEqual([false, false, false, false]);
  });

  it("selects a move and ignores bad slots", () => {
    const start = createDefaultCalcState();
    const state = calcReducer(start, {
      type: "selectMove",
      side: "p2",
      slot: 2,
    });
    expect(state.selected).toEqual({ side: "p2", slot: 2 });
    expect(
      calcReducer(state, { type: "selectMove", side: "p1", slot: 4 }),
    ).toBe(state);
    expect(
      calcReducer(state, { type: "selectMove", side: "p1", slot: -1 }),
    ).toBe(state);
  });
});

describe("calcReducer: field", () => {
  it("sets weather, terrain, gravity and Trick Room", () => {
    const state = reduce(
      createDefaultCalcState(),
      { type: "setWeather", weather: "Rain" },
      { type: "setTerrain", terrain: "Grassy" },
      { type: "setGravity", on: true },
      { type: "setTrickRoom", on: true },
    );
    expect(state).toMatchObject({
      weather: "Rain",
      terrain: "Grassy",
      gravity: true,
      trickRoom: true,
    });
    expect(
      calcReducer(state, { type: "setWeather", weather: null }).weather,
    ).toBeNull();
  });

  it("sets conditions on one side only and clamps Spikes to 0..3", () => {
    const state = reduce(
      createDefaultCalcState(),
      { type: "setSideFlag", side: "p2", flag: "reflect", on: true },
      { type: "setSideFlag", side: "p1", flag: "tailwind", on: true },
      { type: "setSpikes", side: "p2", layers: 5 },
      { type: "setSpikes", side: "p1", layers: -2 },
    );
    expect(state.fieldSides.p2).toEqual({
      ...emptySide(),
      reflect: true,
      spikes: 3,
    });
    expect(state.fieldSides.p1).toEqual({ ...emptySide(), tailwind: true });
  });
});

describe("calcReducer: actions", () => {
  it("swaps the Pokémon, their side conditions and the selection", () => {
    const start = reduce(
      createDefaultCalcState(),
      { type: "setBoost", side: "p1", stat: "atk", value: 1 },
      { type: "setSideFlag", side: "p1", flag: "tailwind", on: true },
      { type: "setWeather", weather: "Sun" },
      { type: "setTrickRoom", on: true },
      { type: "selectMove", side: "p1", slot: 2 },
    );
    const swapped = calcReducer(start, { type: "swapSides" });

    expect(swapped.sides.p1).toBe(start.sides.p2);
    expect(swapped.sides.p2).toBe(start.sides.p1);
    expect(swapped.fieldSides.p2.tailwind).toBe(true);
    expect(swapped.fieldSides.p1.tailwind).toBe(false);
    expect(swapped.selected).toEqual({ side: "p2", slot: 2 });
    expect(swapped.weather).toBe("Sun");
    expect(swapped.trickRoom).toBe(true);
    expect(calcReducer(swapped, { type: "swapSides" })).toEqual(start);
  });

  it("resets everything to the defaults", () => {
    const changed = reduce(
      createDefaultCalcState(),
      { type: "setSet", side: "p1", set: createDefaultSet("Dragonite") },
      { type: "setWeather", weather: "Sand" },
      { type: "setSideFlag", side: "p2", flag: "stealthRock", on: true },
      { type: "selectMove", side: "p2", slot: 1 },
    );
    expect(calcReducer(changed, { type: "reset" })).toEqual(
      createDefaultCalcState(),
    );
  });

  it("restores an earlier state, undoing a reset", () => {
    const changed = reduce(
      createDefaultCalcState(),
      { type: "setSet", side: "p1", set: createDefaultSet("Dragonite") },
      { type: "setTerrain", terrain: "Grassy" },
    );
    const undone = reduce(
      changed,
      { type: "reset" },
      { type: "restore", state: changed },
    );
    expect(undone).toBe(changed);
  });

  it("loads handed-over sets as fresh sides and keeps the field", () => {
    const start = reduce(
      createDefaultCalcState(),
      { type: "setBoost", side: "p1", stat: "atk", value: 2 },
      { type: "setWeather", weather: "Rain" },
      { type: "selectMove", side: "p2", slot: 3 },
    );
    const dragonite = createDefaultSet("Dragonite");
    const loaded = calcReducer(start, {
      type: "loadSets",
      sets: { p1: dragonite },
    });
    expect(loaded.sides.p1).toEqual(createSide(dragonite));
    expect(loaded.sides.p2).toBe(start.sides.p2);
    expect(loaded.weather).toBe("Rain");
    expect(loaded.selected).toEqual({ side: "p1", slot: 0 });

    const megaSet = { ...createDefaultSet("Garchomp"), item: "Garchompite" };
    const both = calcReducer(start, {
      type: "loadSets",
      sets: { p1: dragonite, p2: megaSet },
    });
    expect(both.sides.p2.set).toBe(megaSet);
    expect(both.sides.p2.mega).toBe(true);
  });
});

describe("calcReducer: set origins", () => {
  it("starts both sides as custom, the app's own curated sets", () => {
    expect(createDefaultCalcState().origins).toEqual({
      p1: { kind: "custom" },
      p2: { kind: "custom" },
    });
  });

  it("marks a freshly picked species as assumed", () => {
    const next = calcReducer(createDefaultCalcState(), {
      type: "setSet",
      side: "p2",
      set: createDefaultSet("Dragonite"),
    });
    expect(next.origins.p2).toEqual({ kind: "assumed" });
  });

  it("marks an edit of the same species as custom", () => {
    const picked = reduce(createDefaultCalcState(), {
      type: "setSet",
      side: "p2",
      set: createDefaultSet("Dragonite"),
    });
    const edited = calcReducer(picked, {
      type: "setSet",
      side: "p2",
      set: { ...picked.sides.p2.set, nature: "Adamant" },
    });
    expect(edited.origins.p2).toEqual({ kind: "custom" });
  });

  it("keeps the origin a smart-set fill or the chooser passes along", () => {
    const origin = { kind: "common", index: 2, speciesUsage: 0.5 } as const;
    const next = calcReducer(createDefaultCalcState(), {
      type: "setSet",
      side: "p1",
      set: createDefaultSet("Dragonite"),
      origin,
    });
    expect(next.origins.p1).toEqual(origin);
  });

  it("sets the origin alone, keeping the set untouched", () => {
    const start = createDefaultCalcState();
    const next = calcReducer(start, {
      type: "setOrigin",
      side: "p1",
      origin: { kind: "assumed" },
    });
    expect(next.origins.p1).toEqual({ kind: "assumed" });
    expect(next.sides).toBe(start.sides);
  });

  it("swaps origins with the sides", () => {
    const start = reduce(createDefaultCalcState(), {
      type: "setSet",
      side: "p2",
      set: createDefaultSet("Dragonite"),
    });
    const swapped = calcReducer(start, { type: "swapSides" });
    expect(swapped.origins.p1).toEqual({ kind: "assumed" });
    expect(swapped.origins.p2).toEqual({ kind: "custom" });
  });

  it("loads handed-over sets as custom, never to be refilled", () => {
    const loaded = calcReducer(createDefaultCalcState(), {
      type: "loadSets",
      sets: { p1: createDefaultSet("Dragonite") },
    });
    expect(loaded.origins.p1).toEqual({ kind: "custom" });
  });

  it("resets the origins with everything else", () => {
    const changed = reduce(createDefaultCalcState(), {
      type: "setSet",
      side: "p1",
      set: createDefaultSet("Dragonite"),
    });
    expect(changed.origins.p1).toEqual({ kind: "assumed" });
    expect(calcReducer(changed, { type: "reset" })).toEqual(
      createDefaultCalcState(),
    );
  });
});
