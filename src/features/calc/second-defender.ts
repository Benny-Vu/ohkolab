import { calculateDamage, getMove } from "@/data";
import type { BattleStateHandlers } from "@/features/calc/side-panel";
import { toBattler, toFieldState } from "@/lib/calc/battle";
import type { MoveOutcome } from "@/lib/calc/results";
import {
  MAX_HP_PERCENT,
  MAX_STAGE,
  MIN_HP_PERCENT,
  MIN_STAGE,
  createSide,
  megaFormeOf,
  type CalcSide,
  type CalcState,
} from "@/lib/calc/state";
import {
  emptyBoosts,
  type BattleFormat,
  type BoostStatId,
  type StatusName,
} from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

/** The second defender and what the attacker's moves do to it. */
export interface SecondDefenderData {
  side: CalcSide;
  outcomes: MoveOutcome[];
}

/**
 * What the attacking side (p1)'s moves do to the second defender. Mirrors the
 * main `computeMoveOutcomes`, defending with the partner instead of p2; the
 * two defenders share one side of the field. Never throws.
 */
export function computeSecondOutcomes(
  state: CalcState,
  format: BattleFormat,
  second: CalcSide,
): MoveOutcome[] {
  const attacker = state.sides.p1;
  const outcomes: MoveOutcome[] = [];
  attacker.set.moves.forEach((name, slot) => {
    if (!name) return;
    const info = getMove(name);
    const outcome: MoveOutcome = {
      slot,
      move: info?.name ?? name,
      type: info?.type ?? null,
      category: info?.category ?? null,
      crit: attacker.crits[slot] ?? false,
      kind: "error",
      result: null,
    };

    if (info?.category === "Status") {
      outcome.kind = "status";
    } else if (info) {
      try {
        const result = calculateDamage(
          toBattler(attacker),
          toBattler(second),
          info.name,
          toFieldState(state, format, "p1"),
          { crit: outcome.crit },
        );
        outcome.result = result;
        outcome.kind = result.max > 0 ? "damage" : "none";
      } catch {
        outcome.kind = "error";
      }
    }
    outcomes.push(outcome);
  });

  return outcomes;
}

/**
 * A new set on the second defender, with the same species-change semantics as
 * the main calculator: a different Pokémon starts fresh, and picking up (or
 * losing) a Mega Stone switches Mega Evolution on (or off).
 */
export function applySetChange(side: CalcSide, set: PokemonSet): CalcSide {
  if (set.species !== side.set.species) return createSide(set);
  const couldMega = megaFormeOf(side.set) !== null;
  const canMega = megaFormeOf(set) !== null;
  const mega = canMega ? (couldMega ? side.mega : true) : false;
  return { ...side, set, mega };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** The battle-state edits on the second defender, kept in the calc page. */
export function secondDefenderHandlers(
  value: CalcSide,
  onChange: (next: CalcSide) => void,
): BattleStateHandlers {
  return {
    onSetChange: (set) => onChange(applySetChange(value, set)),
    onBoost: (stat: BoostStatId, v) =>
      onChange({
        ...value,
        boosts: {
          ...value.boosts,
          [stat]: clampInt(v, MIN_STAGE, MAX_STAGE),
        },
      }),
    onClearBoosts: () => onChange({ ...value, boosts: emptyBoosts() }),
    onStatus: (status: StatusName | null) => onChange({ ...value, status }),
    onHpPercent: (v) =>
      onChange({
        ...value,
        hpPercent: clampInt(v, MIN_HP_PERCENT, MAX_HP_PERCENT),
      }),
    onMega: (on) =>
      onChange({ ...value, mega: on && megaFormeOf(value.set) !== null }),
  };
}
