import { calculateDamage, getMove } from "@/data";
import { toBattler, toFieldState } from "@/lib/calc/battle";
import {
  MAX_HP_PERCENT,
  MIN_HP_PERCENT,
  otherSide,
  SIDE_IDS,
  type CalcState,
  type MoveSelection,
  type SideId,
} from "@/lib/calc/state";
import type { BattleFormat, DamageResult } from "@/types/battle";
import type { MoveCategory, TypeName } from "@/types/pokemon";

/**
 * - "damage": the move hurts the target.
 * - "none": an attacking move that does nothing here (immunity).
 * - "status": a status move; there is nothing to calculate.
 * - "error": the move or a Pokémon is unknown to the calc.
 */
type MoveOutcomeKind = "damage" | "none" | "status" | "error";

export interface MoveOutcome {
  /** Index of the move in the attacker's four slots. */
  slot: number;
  move: string;
  type: TypeName | null;
  category: MoveCategory | null;
  crit: boolean;
  kind: MoveOutcomeKind;
  /** Present for "damage" and "none". */
  result: DamageResult | null;
}

/**
 * What each chosen move of `attacker` does to the other side. Empty move
 * slots are left out. Never throws.
 */
export function computeMoveOutcomes(
  state: CalcState,
  format: BattleFormat,
  attacker: SideId,
): MoveOutcome[] {
  const side = state.sides[attacker];
  const outcomes: MoveOutcome[] = [];

  side.set.moves.forEach((name, slot) => {
    if (!name) return;
    const info = getMove(name);
    const outcome: MoveOutcome = {
      slot,
      move: info?.name ?? name,
      type: info?.type ?? null,
      category: info?.category ?? null,
      crit: side.crits[slot] ?? false,
      kind: "error",
      result: null,
    };

    if (info?.category === "Status") {
      outcome.kind = "status";
    } else if (info) {
      try {
        const result = calculateDamage(
          toBattler(side),
          toBattler(state.sides[otherSide(attacker)]),
          info.name,
          toFieldState(state, format, attacker),
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

/** The outcomes of both directions, keyed by the attacking side. */
export function computeAllOutcomes(
  state: CalcState,
  format: BattleFormat,
): Record<SideId, MoveOutcome[]> {
  return {
    p1: computeMoveOutcomes(state, format, "p1"),
    p2: computeMoveOutcomes(state, format, "p2"),
  };
}

export interface ResolvedSelection {
  side: SideId;
  outcome: MoveOutcome;
}

/**
 * The outcome to show in full: the selected move when it exists, otherwise
 * the first move of that side, otherwise the first move of the other side.
 * Null when neither side has a move.
 */
export function resolveSelection(
  selected: MoveSelection,
  outcomes: Record<SideId, MoveOutcome[]>,
): ResolvedSelection | null {
  const own = outcomes[selected.side];
  const exact = own.find((outcome) => outcome.slot === selected.slot);
  if (exact) return { side: selected.side, outcome: exact };
  for (const side of [selected.side, ...SIDE_IDS]) {
    const first = outcomes[side][0];
    if (first) return { side, outcome: first };
  }
  return null;
}

/** "45.2 - 53.6%", "100%" for a fixed amount, "0%" or a dash. */
export function outcomeRangeText(outcome: MoveOutcome): string {
  if (outcome.kind === "none") return "0%";
  if (outcome.kind !== "damage" || !outcome.result) return "–";
  const { minPercent, maxPercent } = outcome.result;
  return minPercent === maxPercent
    ? `${maxPercent}%`
    : `${minPercent} - ${maxPercent}%`;
}

/** The KO text of a damaging move, or a short reason there is none. */
export function outcomeSummary(outcome: MoveOutcome): string {
  switch (outcome.kind) {
    case "damage":
      return outcome.result?.koText || "Not a KO";
    case "none":
      return "No effect";
    case "status":
      return "Status move";
    case "error":
      return "Cannot be calculated";
  }
}

export interface RemainingHp {
  /** The defender's HP before the hit. */
  current: number;
  max: number;
  /** HP left after the highest and the lowest roll. */
  minRemaining: number;
  maxRemaining: number;
  /** The same three amounts as percentages of max HP, one decimal. */
  currentPercent: number;
  minPercent: number;
  maxPercent: number;
}

function percentOf(amount: number, max: number): number {
  return max > 0 ? Math.round((amount / max) * 1000) / 10 : 0;
}

/** The HP range a defender at `hpPercent` is left with after taking a hit. */
export function remainingHp(
  result: Pick<DamageResult, "min" | "max" | "defenderMaxHp">,
  hpPercent: number,
): RemainingHp {
  const max = result.defenderMaxHp;
  const percent = Math.min(MAX_HP_PERCENT, Math.max(MIN_HP_PERCENT, hpPercent));
  const current = Math.max(1, Math.round((max * percent) / 100));
  const minRemaining = Math.max(0, current - result.max);
  const maxRemaining = Math.max(0, current - result.min);
  return {
    current,
    max,
    minRemaining,
    maxRemaining,
    currentPercent: percentOf(current, max),
    minPercent: percentOf(minRemaining, max),
    maxPercent: percentOf(maxRemaining, max),
  };
}
