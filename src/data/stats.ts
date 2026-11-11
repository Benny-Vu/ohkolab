import { Stats } from "@smogon/calc";

import { gen } from "@/data/gen";
import { getSpecies } from "@/data/species";
import {
  STAT_IDS,
  type PokemonSet,
  type StatId,
  type StatsTable,
} from "@/types/pokemon";

/** Every Pokémon in Champions battles at this level. */
export const LEVEL = 50;
/** Most Stat Points a single stat can take. */
export const MAX_SP_PER_STAT = 32;
/** Most Stat Points a Pokémon can have across all stats. */
export const MAX_SP_TOTAL = 66;

/** One final stat from a base stat, Stat Points and a nature. */
export function calcStat(
  stat: StatId,
  base: number,
  statPoints: number,
  nature: string,
): number {
  return Stats.calcStatChampions(gen.natures, stat, base, statPoints, nature);
}

/** Final stats of a set. Unknown species give all zeroes. */
export function calcStats(
  set: Pick<PokemonSet, "species" | "nature" | "statPoints">,
): StatsTable {
  const info = getSpecies(set.species);
  const stats = {} as StatsTable;
  for (const stat of STAT_IDS) {
    stats[stat] = info
      ? calcStat(stat, info.baseStats[stat], set.statPoints[stat], set.nature)
      : 0;
  }
  return stats;
}

/** Sum of the Stat Points spent on a set. */
export function totalStatPoints(statPoints: StatsTable): number {
  return STAT_IDS.reduce((total, stat) => total + statPoints[stat], 0);
}
