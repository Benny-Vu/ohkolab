import { describe, expect, it } from "vitest";

import { getSpecies } from "@/data";
import {
  battleName,
  battleSet,
  sideConditions,
  toBattler,
  toFieldState,
} from "@/lib/calc/battle";
import {
  calcReducer,
  createDefaultCalcState,
  type CalcState,
} from "@/lib/calc/state";
import { emptySide } from "@/types/battle";

function megaGarchomp(): CalcState {
  const state = createDefaultCalcState();
  return calcReducer(state, {
    type: "setSet",
    side: "p1",
    set: { ...state.sides.p1.set, item: "Garchompite" },
  });
}

describe("battleSet", () => {
  it("is the set itself without Mega Evolution", () => {
    const { p1 } = createDefaultCalcState().sides;
    expect(battleSet(p1)).toBe(p1.set);
    expect(battleName(p1)).toBe("Garchomp");
  });

  it("becomes the Mega forme with that forme's ability", () => {
    const { p1 } = megaGarchomp().sides;
    const set = battleSet(p1);
    expect(set.species).toBe("Garchomp-Mega");
    expect(set.ability).toBe(getSpecies("Garchomp-Mega")?.abilities[0]);
    expect(set.ability).not.toBe(p1.set.ability);
    expect(set.item).toBe("Garchompite");
    expect(set.moves).toEqual(p1.set.moves);
    expect(battleName(p1)).toBe("Garchomp-Mega");
    // The stored set is left alone.
    expect(p1.set.species).toBe("Garchomp");
  });

  it("stays the base forme while the Mega switch is off", () => {
    const state = calcReducer(megaGarchomp(), {
      type: "setMega",
      side: "p1",
      on: false,
    });
    expect(battleName(state.sides.p1)).toBe("Garchomp");
  });
});

describe("toBattler", () => {
  it("carries stages, status and HP", () => {
    let state = megaGarchomp();
    state = calcReducer(state, {
      type: "setBoost",
      side: "p1",
      stat: "atk",
      value: 2,
    });
    state = calcReducer(state, {
      type: "setStatus",
      side: "p1",
      status: "brn",
    });
    state = calcReducer(state, { type: "setHpPercent", side: "p1", value: 55 });

    expect(toBattler(state.sides.p1)).toEqual({
      set: battleSet(state.sides.p1),
      boosts: { atk: 2, def: 0, spa: 0, spd: 0, spe: 0 },
      status: "brn",
      hpPercent: 55,
    });
  });
});

describe("toFieldState", () => {
  function fieldState(): CalcState {
    let state = createDefaultCalcState();
    state = calcReducer(state, { type: "setWeather", weather: "Rain" });
    state = calcReducer(state, { type: "setTerrain", terrain: "Misty" });
    state = calcReducer(state, { type: "setGravity", on: true });
    state = calcReducer(state, { type: "setTrickRoom", on: true });
    state = calcReducer(state, {
      type: "setSideFlag",
      side: "p1",
      flag: "helpingHand",
      on: true,
    });
    state = calcReducer(state, {
      type: "setSideFlag",
      side: "p2",
      flag: "reflect",
      on: true,
    });
    state = calcReducer(state, {
      type: "setSideFlag",
      side: "p2",
      flag: "friendGuard",
      on: true,
    });
    return calcReducer(state, { type: "setSpikes", side: "p2", layers: 2 });
  }

  it("puts each Pokémon's conditions on the right side per direction", () => {
    const state = fieldState();
    const forward = toFieldState(state, "doubles", "p1");
    expect(forward).toMatchObject({
      format: "doubles",
      weather: "Rain",
      terrain: "Misty",
      gravity: true,
      trickRoom: true,
    });
    expect(forward.attackerSide).toEqual({ ...emptySide(), helpingHand: true });
    expect(forward.defenderSide).toEqual({
      ...emptySide(),
      reflect: true,
      friendGuard: true,
      spikes: 2,
    });

    const backward = toFieldState(state, "doubles", "p2");
    expect(backward.attackerSide).toEqual(forward.defenderSide);
    expect(backward.defenderSide).toEqual(forward.attackerSide);
  });

  it("drops ally-only conditions in singles", () => {
    const field = toFieldState(fieldState(), "singles", "p1");
    expect(field.format).toBe("singles");
    expect(field.attackerSide.helpingHand).toBe(false);
    expect(field.defenderSide.friendGuard).toBe(false);
    expect(field.defenderSide.reflect).toBe(true);
    expect(field.defenderSide.spikes).toBe(2);
  });

  it("leaves the stored conditions untouched", () => {
    const side = { ...emptySide(), helpingHand: true, tailwind: true };
    expect(sideConditions(side, "singles")).toEqual({
      ...emptySide(),
      tailwind: true,
    });
    expect(side.helpingHand).toBe(true);
    expect(sideConditions(side, "doubles")).toBe(side);
  });
});
