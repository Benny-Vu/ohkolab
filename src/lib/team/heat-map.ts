import { calcStats } from "@/data";
import { defensiveOverview, memberLabel } from "@/lib/team/analysis";
import type { PokemonSet } from "@/types/pokemon";

/**
 * Types at least two team members are weak to, as short sentences.
 * "3 Pokémon weak to Ice, no resist" — the "no resist" suffix marks types
 * nothing on the team resists or is immune to.
 */
export function defensiveWeakSpots(members: PokemonSet[]): string[] {
  return defensiveOverview(members)
    .filter((entry) => entry.weak >= 2)
    .sort((a, b) => b.weak - a.weak)
    .map((entry) => {
      const covered = entry.resistant + entry.immune > 0;
      return covered
        ? `${entry.weak} Pokémon weak to ${entry.type}`
        : `${entry.weak} Pokémon weak to ${entry.type}, no resist`;
    });
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
