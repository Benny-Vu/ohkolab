import { beforeEach, describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import {
  calcReducer,
  createDefaultCalcState,
  type CalcAction,
  type CalcState,
} from "@/lib/calc/state";
import {
  CALC_STORAGE_KEY,
  loadCalcState,
  parseCalcState,
  parseHandoff,
  parsePokemonSet,
  saveCalcState,
} from "@/lib/calc/storage";
import { emptySide } from "@/types/battle";

function reduce(state: CalcState, ...actions: CalcAction[]): CalcState {
  return actions.reduce(calcReducer, state);
}

function changedState(): CalcState {
  const start = createDefaultCalcState();
  return reduce(
    start,
    {
      type: "setSet",
      side: "p1",
      set: { ...start.sides.p1.set, item: "Garchompite", nickname: "Chompy" },
    },
    { type: "setBoost", side: "p1", stat: "atk", value: 2 },
    { type: "setStatus", side: "p2", status: "brn" },
    { type: "setHpPercent", side: "p2", value: 63 },
    { type: "setCrit", side: "p1", slot: 2, on: true },
    { type: "setWeather", weather: "Sand" },
    { type: "setTerrain", terrain: "Psychic" },
    { type: "setGravity", on: true },
    { type: "setTrickRoom", on: true },
    { type: "setSideFlag", side: "p2", flag: "auroraVeil", on: true },
    { type: "setSpikes", side: "p1", layers: 2 },
    { type: "selectMove", side: "p2", slot: 1 },
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("parsePokemonSet", () => {
  it("accepts a valid set unchanged", () => {
    const set = createDefaultCalcState().sides.p1.set;
    expect(parsePokemonSet(JSON.parse(JSON.stringify(set)))).toEqual(set);
    const full = { ...set, nickname: "Chompy", gender: "F" as const };
    expect(parsePokemonSet(full)).toEqual(full);
  });

  it("rejects data without a Champions species", () => {
    expect(parsePokemonSet(null)).toBeNull();
    expect(parsePokemonSet("Garchomp")).toBeNull();
    expect(parsePokemonSet([])).toBeNull();
    expect(parsePokemonSet({})).toBeNull();
    expect(parsePokemonSet({ species: 7 })).toBeNull();
    expect(parsePokemonSet({ species: "Missingno" })).toBeNull();
  });

  it("fills in or repairs everything else", () => {
    expect(parsePokemonSet({ species: "garchomp" })).toEqual(
      createDefaultSet("Garchomp"),
    );
    expect(
      parsePokemonSet({
        species: "Garchomp",
        item: "Not An Item",
        ability: "Not An Ability",
        nature: "Sleepy",
        statPoints: { hp: 99, atk: -4, def: "8", spa: 3.4, spe: 32 },
        moves: ["earthquake", "Not A Move", 5],
        nickname: "  ",
        gender: "X",
      }),
    ).toEqual({
      species: "Garchomp",
      item: null,
      ability: "Sand Veil",
      nature: "Hardy",
      statPoints: { hp: 32, atk: 0, def: 0, spa: 3, spd: 0, spe: 32 },
      moves: ["Earthquake", null, null, null],
    });
  });
});

describe("parseHandoff", () => {
  it("maps attacker and defender to Pokémon 1 and 2", () => {
    const attacker = createDefaultSet("Dragonite");
    const defender = createDefaultSet("Kingambit");
    expect(parseHandoff({ attacker, defender })).toEqual({
      p1: attacker,
      p2: defender,
    });
    expect(parseHandoff({ attacker })).toEqual({ p1: attacker });
    expect(parseHandoff({ defender })).toEqual({ p2: defender });
  });

  it("is null for anything without a usable set", () => {
    expect(parseHandoff(null)).toBeNull();
    expect(parseHandoff(undefined)).toBeNull();
    expect(parseHandoff("attacker")).toBeNull();
    expect(parseHandoff({})).toBeNull();
    expect(parseHandoff({ attacker: { species: "Missingno" } })).toBeNull();
    expect(parseHandoff({ from: "/teams" })).toBeNull();
  });

  it("keeps the usable set when the other is broken", () => {
    const defender = createDefaultSet("Kingambit");
    expect(
      parseHandoff({ attacker: { species: "Missingno" }, defender }),
    ).toEqual({ p2: defender });
  });
});

describe("parseCalcState", () => {
  it("round-trips a state through JSON", () => {
    const state = changedState();
    expect(state.sides.p1.mega).toBe(true);
    expect(parseCalcState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const defaults = createDefaultCalcState();
    expect(parseCalcState(JSON.parse(JSON.stringify(defaults)))).toEqual(
      defaults,
    );
  });

  it("falls back to the defaults for anything that is not a state", () => {
    const defaults = createDefaultCalcState();
    expect(parseCalcState(null)).toEqual(defaults);
    expect(parseCalcState("nope")).toEqual(defaults);
    expect(parseCalcState([1, 2])).toEqual(defaults);
    expect(parseCalcState({})).toEqual(defaults);
  });

  it("replaces only the broken parts", () => {
    const state = changedState();
    const raw = JSON.parse(JSON.stringify(state));
    raw.sides.p2 = { set: { species: "Missingno" } };
    raw.sides.p1.boosts = { atk: 40, def: "x" };
    raw.sides.p1.hpPercent = -3;
    raw.sides.p1.status = "confused";
    raw.sides.p1.crits = "yes";
    raw.weather = "Fog";
    raw.terrain = null;
    raw.gravity = "true";
    raw.trickRoom = "true";
    raw.fieldSides.p1 = { tailwind: true, spikes: 12, reflect: 1 };
    raw.fieldSides.p2 = null;
    raw.selected = { side: "p3", slot: 1 };

    const parsed = parseCalcState(raw);
    const defaults = createDefaultCalcState();
    expect(parsed.sides.p2).toEqual(defaults.sides.p2);
    expect(parsed.sides.p1).toEqual({
      set: state.sides.p1.set,
      boosts: { atk: 6, def: 0, spa: 0, spd: 0, spe: 0 },
      status: null,
      hpPercent: 1,
      mega: true,
      crits: [false, false, false, false],
    });
    expect(parsed).toMatchObject({
      weather: null,
      terrain: null,
      gravity: false,
      trickRoom: false,
      selected: defaults.selected,
    });
    expect(parsed.fieldSides.p1).toEqual({
      ...emptySide(),
      tailwind: true,
      spikes: 3,
    });
    expect(parsed.fieldSides.p2).toEqual(emptySide());
  });

  it("drops a Mega flag the set cannot back up and bad selections", () => {
    const raw = JSON.parse(JSON.stringify(createDefaultCalcState()));
    raw.sides.p1.mega = true;
    raw.selected = { side: "p2", slot: 9 };
    const parsed = parseCalcState(raw);
    expect(parsed.sides.p1.mega).toBe(false);
    expect(parsed.selected).toEqual({ side: "p1", slot: 0 });
  });
});

describe("loadCalcState and saveCalcState", () => {
  it("starts from the defaults when nothing is stored", () => {
    expect(loadCalcState()).toEqual(createDefaultCalcState());
  });

  it("restores what was saved", () => {
    const state = changedState();
    saveCalcState(state);
    expect(localStorage.getItem(CALC_STORAGE_KEY)).not.toBeNull();
    expect(loadCalcState()).toEqual(state);
  });

  it("falls back to the defaults for corrupt or foreign data", () => {
    const defaults = createDefaultCalcState();
    localStorage.setItem(CALC_STORAGE_KEY, "{not json");
    expect(loadCalcState()).toEqual(defaults);

    localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify("text"));
    expect(loadCalcState()).toEqual(defaults);

    localStorage.setItem(
      CALC_STORAGE_KEY,
      JSON.stringify({ version: 99, state: changedState() }),
    );
    expect(loadCalcState()).toEqual(defaults);

    localStorage.setItem(
      CALC_STORAGE_KEY,
      JSON.stringify({ version: 1, state: 5 }),
    );
    expect(loadCalcState()).toEqual(defaults);
  });
});
