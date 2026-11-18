import { calcStats } from "@/data";
import { defensiveOverview, memberLabel } from "@/lib/team/analysis";
import type { PokemonSet, TypeName } from "@/types/pokemon";

/**
 * A type at least two team members are weak to, as structured data: the
 * page that renders it turns `type`/`weak`/`noResist` into a sentence
 * through the dictionary (`noResist` marks types nothing on the team
 * resists or is immune to).
 */
export interface WeakSpot {
  type: TypeName;
  /** How many members are weak to the type (2x or 4x damage). */
  weak: number;
  /** True when nothing on the team resists or is immune to the type. */
  noResist: boolean;
}

/** Types at least two team members are weak to, most-shared first. */
export function defensiveWeakSpots(members: PokemonSet[]): WeakSpot[] {
  return defensiveOverview(members)
    .filter((entry) => entry.weak >= 2)
    .sort((a, b) => b.weak - a.weak)
    .map((entry) => ({
      type: entry.type,
      weak: entry.weak,
      noResist: entry.resistant + entry.immune === 0,
    }));
}

export interface SpeedTier {
  member: PokemonSet;
  label: string;
  speed: number;
}

/** Team members sorted by final Speed, fastest first. */
export function speedTiers(members: PokemonSet[]): SpeedTier[] {
  return members
    .map((member) => ({
      member,
      label: memberLabel(member),
      speed: calcStats(member).spe,
    }))
    .sort((a, b) => b.speed - a.speed);
}
