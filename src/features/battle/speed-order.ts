import { calcStats } from "@/data";
import { finalSpeed } from "@/lib/calc/speed";
import type { PokemonSet } from "@/types/pokemon";
import {
  rangeIsInconsistent,
  type SpeedRange,
} from "@/features/battle/speed-note";

/**
 * Speed order: one list of all twelve Pokémon, fastest first. The maths is
 * the same `finalSpeed` the calculator uses, so the two screens can never
 * disagree about a Speed stat.
 */

export type SpeedSide = "mine" | "theirs";

/** One Pokémon in the speed list. */
export interface SpeedMember {
  /** Stable id: the slot key in the page's state. */
  key: string;
  /** The name to show (a nickname or the species). */
  name: string;
  species: string;
  side: SpeedSide;
  set: PokemonSet;
}

/** The field and item toggles the speed list reacts to. */
export interface SpeedToggles {
  myTailwind: boolean;
  theirTailwind: boolean;
  trickRoom: boolean;
  /** Per-Pokémon Choice Scarf toggles, keyed by `SpeedMember.key`. */
  scarves: Record<string, boolean>;
}

/** One computed row of the speed list. */
export interface SpeedRow {
  key: string;
  name: string;
  species: string;
  side: SpeedSide;
  /** The Speed stat before any modifier. */
  base: number;
  /** Speed after Tailwind and Choice Scarf. */
  final: number;
  /** A Scarf is active: the user toggled it or the set holds one. */
  scarf: boolean;
  tailwind: boolean;
  /**
   * The Speed range the battle notes narrowed this opponent into, when the
   * notes hold one (their side only). Null bounds mean "no idea on that
   * side"; the raw stat range ignores this panel's field toggles.
   */
  range?: SpeedRange;
}

export const EMPTY_SPEED_TOGGLES: SpeedToggles = {
  myTailwind: false,
  theirTailwind: false,
  trickRoom: false,
  scarves: {},
};

/** The speed rows of all members, in the order the members were given. */
export function speedRows(
  members: readonly SpeedMember[],
  toggles: SpeedToggles,
  notedRanges?: Readonly<Record<string, SpeedRange>>,
): SpeedRow[] {
  return members.map((member) => {
    const base = calcStats(member.set).spe;
    const scarf =
      toggles.scarves[member.key] === true ||
      member.set.item === "Choice Scarf";
    const tailwind =
      member.side === "mine" ? toggles.myTailwind : toggles.theirTailwind;
    const range =
      member.side === "theirs" ? notedRanges?.[member.species] : undefined;
    return {
      key: member.key,
      name: member.name,
      species: member.species,
      side: member.side,
      base,
      final: finalSpeed({ stat: base, tailwind, choiceScarf: scarf }),
      scarf,
      tailwind,
      ...(range && (range.min !== null || range.max !== null) ? { range } : {}),
    };
  });
}

/**
 * The Speed a row sorts by: the notes' range when there is one — its lower
 * bound when known (an "at least" note means fast), otherwise its upper —
 * and the computed final Speed otherwise. A range the notes contradict
 * (min above max) says nothing, so it falls back to the guess.
 */
export function rowSortKey(row: SpeedRow): number {
  if (row.range && !rangeIsInconsistent(row.range)) {
    const bound = row.range.min ?? row.range.max;
    if (bound !== null && bound !== undefined) return bound;
  }
  return row.final;
}

/**
 * The rows in turn order: fastest first — unless Trick Room is up, where the
 * slowest moves first. Equal Speeds keep their input order (the games call
 * that a tie, and who wins it is a roll, not a fact).
 */
export function orderSpeedRows(
  rows: readonly SpeedRow[],
  trickRoom: boolean,
): SpeedRow[] {
  // A stable sort, so equal Speeds keep their input order both directions.
  return [...rows].sort((a, b) => {
    const diff = rowSortKey(a) - rowSortKey(b);
    return trickRoom ? diff : -diff;
  });
}
