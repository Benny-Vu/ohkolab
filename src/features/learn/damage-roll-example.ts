import { calculateDamage, createDefaultSet } from "@/data";
import { battlerFromSet, emptyField } from "@/types/battle";
import { emptyStatsTable } from "@/types/pokemon";
import type { DamageResult } from "@/types/battle";

/**
 * The live example on the damage-rolls explainer: one fixed calculation the
 * page renders every visit, so the range the reader sees is a real
 * Champions number, not a made-up one. The sets are legal Champions sets
 * (level 50, Stat Points within the 0–32 / 66 budget); the field is the
 * app's default doubles, so the spread Earthquake carries its 0.75.
 */

const ATTACKER = "Garchomp";
const DEFENDER = "Incineroar";
const MOVE = "Earthquake";

/** A Garchomp with its attack and speed trained (64 of 66 SP spent). */
function garchompSet() {
  const set = createDefaultSet(ATTACKER);
  return {
    ...set,
    nature: "Adamant",
    statPoints: { ...emptyStatsTable(), atk: 32, spe: 32 },
  };
}

/** An Incineroar with bulk spread across HP and both defences. */
function incineroarSet() {
  const set = createDefaultSet(DEFENDER);
  return {
    ...set,
    nature: "Calm",
    statPoints: { ...emptyStatsTable(), hp: 32, def: 12, spd: 20 },
  };
}

let cached: DamageResult | undefined;

/** The example calculation, computed once per session. */
export function damageRollExample(): DamageResult {
  cached ??= calculateDamage(
    battlerFromSet(garchompSet()),
    battlerFromSet(incineroarSet()),
    MOVE,
    emptyField("doubles"),
  );
  return cached;
}

/** The example's attacker, defender and move, for the translated line. */
export const DAMAGE_ROLL_EXAMPLE = {
  attacker: ATTACKER,
  defender: DEFENDER,
  move: MOVE,
} as const;
