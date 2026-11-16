import { getSpecies } from "@/data";
import {
  megaFormeOf,
  otherSide,
  type CalcSide,
  type CalcState,
  type SideId,
} from "@/lib/calc/state";
import type {
  BattleFormat,
  BattlerState,
  FieldState,
  SideState,
} from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

/**
 * The set as it stands in battle: the Mega forme with that forme's ability
 * when the side is Mega Evolved, otherwise the set unchanged.
 */
export function battleSet(side: CalcSide): PokemonSet {
  const forme = side.mega ? megaFormeOf(side.set) : null;
  if (!forme) return side.set;
  const ability = getSpecies(forme)?.abilities[0] ?? side.set.ability;
  return { ...side.set, species: forme, ability };
}

/** The name of the forme a side battles as, e.g. "Garchomp-Mega". */
export function battleName(side: CalcSide): string {
  return battleSet(side).species;
}

/**
 * A name for each side to show next to results. Two Pokémon of the same forme
 * are told apart by their number.
 */
export function sideNames(state: CalcState): Record<SideId, string> {
  const p1 = battleName(state.sides.p1);
  const p2 = battleName(state.sides.p2);
  return p1 === p2 ? { p1: `${p1} (1)`, p2: `${p2} (2)` } : { p1, p2 };
}

/** A side as the damage function wants it. */
export function toBattler(side: CalcSide): BattlerState {
  return {
    set: battleSet(side),
    boosts: side.boosts,
    status: side.status,
    hpPercent: side.hpPercent,
  };
}

/** Conditions of one side, without those that cannot exist in the format. */
export function sideConditions(
  side: SideState,
  format: BattleFormat,
): SideState {
  if (format === "doubles") return side;
  // Both need an ally on the field.
  return { ...side, helpingHand: false, friendGuard: false };
}

/** The field as seen by a move going from `attacker` into the other side. */
export function toFieldState(
  state: CalcState,
  format: BattleFormat,
  attacker: SideId,
): FieldState {
  return {
    format,
    weather: state.weather,
    terrain: state.terrain,
    gravity: state.gravity,
    attackerSide: sideConditions(state.fieldSides[attacker], format),
    defenderSide: sideConditions(state.fieldSides[otherSide(attacker)], format),
  };
}
