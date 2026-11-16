import { calcStat, getSpecies } from "@/data";
import type { PokemonUsage } from "@/lib/metagame/types";

export interface SpeedTierEntry {
  nature: string;
  speedStatPoints: number;
  share: number;
  speed: number;
}

export interface SpeedTier {
  species: string;
  rank: number;
  entries: SpeedTierEntry[];
  maxSpeed: number;
  minSpeed: number;
  choiceScarf: boolean;
  unburden: boolean;
}

const SCARF = "choice scarf";
const UNBURDEN = "unburden";

/**
 * Speed tiers in usage-rank order (per the data-sources note, not speed-sorted).
 * Species unknown to the dex are skipped.
 */
export function speedTiers(pokemon: PokemonUsage[]): SpeedTier[] {
  const tiers: SpeedTier[] = [];
  for (const usage of pokemon) {
    const species = getSpecies(usage.species);
    if (!species) continue;
    const base = species.baseStats.spe;
    tiers.push({
      species: usage.species,
      rank: usage.rank,
      entries: usage.spreads.map((spread) => ({
        nature: spread.nature,
        speedStatPoints: spread.statPoints.spe,
        share: spread.share,
        speed: calcStat("spe", base, spread.statPoints.spe, spread.nature),
      })),
      maxSpeed: calcStat("spe", base, 32, "Jolly"),
      minSpeed: calcStat("spe", base, 0, "Brave"),
      choiceScarf: usage.items.some(
        (item) => item.name.toLowerCase() === SCARF,
      ),
      unburden: usage.abilities.some(
        (ability) => ability.name.toLowerCase() === UNBURDEN,
      ),
    });
  }
  return tiers;
}
