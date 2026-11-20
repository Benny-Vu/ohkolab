import { calculateDamage, getMove } from "@/data";
import { koResultOf } from "@/features/calc/ko-result";
import type { KoLabelResult } from "@/components/ko-label";
import { battlerFromSet, emptyField, type BattleFormat } from "@/types/battle";
import type { TypeName } from "@/types/pokemon";
import type { PokemonSet } from "@/types/pokemon";
import type { OpponentInput } from "@/features/battle/opponent-input";

/**
 * The KO matrix: every pair of the two teams, both directions. Computed in a
 * web worker (`matrix-worker.ts`) or synchronously as a fallback — this
 * module is the one shared piece of maths both paths call, so the results can
 * never disagree.
 */

/** Same outcome kinds as the calculator's results panel. */
export type MatrixMoveKind = "damage" | "none" | "status" | "error";

/** One move of one attacker into one defender. */
export interface MatrixMove {
  move: string;
  type: TypeName | null;
  kind: MatrixMoveKind;
  /** Damage as a percentage of the defender's max HP; null when not damage. */
  minPercent: number | null;
  maxPercent: number | null;
  /** The short label for `KoLabel`, when the KO text carries one. */
  ko: KoLabelResult | null;
  /** The calc library's own KO summary, e.g. "37.5% chance to OHKO". */
  koText: string;
  /** Full one-line description of the calc, e.g. "32 Atk Garchomp ...". */
  description: string;
}

/** One attacker–defender pair: every move, plus the best one picked. */
export interface MatrixCell {
  moves: MatrixMove[];
  best: MatrixMove | null;
}

/** Both directions: rows are the attackers' teams, columns the defenders'. */
export interface BattleMatrix {
  /** mySets.length × opponents.length; row i, column j is mine[i] into theirs[j]. */
  mine: MatrixCell[][];
  /** opponents.length × mySets.length; row i, column j is theirs[i] into mine[j]. */
  theirs: MatrixCell[][];
}

/** The worker request: the two teams and the format the damage maths need. */
export interface MatrixRequest {
  mySets: PokemonSet[];
  opponents: OpponentInput[];
  format: BattleFormat;
}

/**
 * How one move outranks another as "the best move": a move whose lowest roll
 * already KOs beats one that only might; a possible OHKO beats any non-OHKO;
 * after that the higher guaranteed roll wins, then the higher top roll.
 * Status moves and calculation errors never compete.
 */
export function bestMoveOf(moves: readonly MatrixMove[]): MatrixMove | null {
  let best: MatrixMove | null = null;
  for (const move of moves) {
    if (move.kind !== "damage") continue;
    if (!best) {
      best = move;
      continue;
    }
    if (moveScore(move) > moveScore(best)) best = move;
  }
  return best;
}

function moveScore(move: MatrixMove): [number, number, number, number] {
  const min = move.minPercent ?? 0;
  const max = move.maxPercent ?? 0;
  return [min >= 100 ? 1 : 0, max >= 100 ? 1 : 0, min, max];
}

/** "45.2 - 53.6%", "100%" for a fixed amount, "0%" or a dash. */
export function matrixRangeText(move: MatrixMove): string {
  if (move.kind === "none") return "0%";
  if (move.kind !== "damage") return "–";
  const min = move.minPercent ?? 0;
  const max = move.maxPercent ?? 0;
  return min === max ? `${max}%` : `${min} - ${max}%`;
}

function errorMove(move: string): MatrixMove {
  return {
    move,
    type: null,
    kind: "error",
    minPercent: null,
    maxPercent: null,
    ko: null,
    koText: "",
    description: "",
  };
}

function toMatrixMove(
  move: string,
  type: TypeName | null,
  result: ReturnType<typeof calculateDamage>,
): MatrixMove {
  return {
    move,
    type,
    kind: result.max > 0 ? "damage" : "none",
    minPercent: result.minPercent,
    maxPercent: result.maxPercent,
    ko: koResultOf(result.koText),
    koText: result.koText,
    description: result.description,
  };
}

/** Every move of `attacker` into `defender`, with the best one picked. */
export function matrixCellOf(
  attacker: PokemonSet,
  defender: PokemonSet,
  format: BattleFormat,
): MatrixCell {
  const field = emptyField(format);
  const moves: MatrixMove[] = [];
  for (const name of attacker.moves) {
    if (!name) continue;
    const info = getMove(name);
    if (!info) {
      moves.push(errorMove(name));
      continue;
    }
    if (info.category === "Status") {
      moves.push({
        move: info.name,
        type: info.type,
        kind: "status",
        minPercent: null,
        maxPercent: null,
        ko: null,
        koText: "",
        description: "",
      });
      continue;
    }
    try {
      const result = calculateDamage(
        battlerFromSet(attacker),
        battlerFromSet(defender),
        info.name,
        field,
      );
      moves.push(toMatrixMove(info.name, info.type, result));
    } catch {
      moves.push(errorMove(info.name));
    }
  }
  return { moves, best: bestMoveOf(moves) };
}

/** All pairs of one direction: `attackers.length × defenders.length` cells. */
function pairCells(
  attackers: readonly PokemonSet[],
  defenders: readonly PokemonSet[],
  format: BattleFormat,
): MatrixCell[][] {
  return attackers.map((attacker) =>
    defenders.map((defender) => matrixCellOf(attacker, defender, format)),
  );
}

/**
 * The whole matrix, both directions, under the given format. Both teams are
 * at full health with no field conditions: this is the team-preview view,
 * before anything has happened in the match.
 */
export function computeMatrix({
  mySets,
  opponents,
  format,
}: MatrixRequest): BattleMatrix {
  const theirSets = opponents.map((opponent) => opponent.set);
  return {
    mine: pairCells(mySets, theirSets, format),
    theirs: pairCells(theirSets, mySets, format),
  };
}
