import { calcStats } from "@/data";
import { finalSpeed } from "@/lib/calc/speed";
import type { PokemonSet } from "@/types/pokemon";

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
): SpeedRow[] {
  return members.map((member) => {
    const base = calcStats(member.set).spe;
    const scarf =
      toggles.scarves[member.key] === true ||
      member.set.item === "Choice Scarf";
    const tailwind =
      member.side === "mine" ? toggles.myTailwind : toggles.theirTailwind;
    return {
      key: member.key,
      name: member.name,
      species: member.species,
      side: member.side,
      base,
      final: finalSpeed({ stat: base, tailwind, choiceScarf: scarf }),
      scarf,
      tailwind,
    };
  });
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
  return [...rows].sort((a, b) =>
    trickRoom ? a.final - b.final : b.final - a.final,
  );
}
