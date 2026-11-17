import {
  DEFAULT_NATURE,
  getAbility,
  getItem,
  getNature,
  MAX_SP_TOTAL,
  totalStatPoints,
} from "@/data";
import { resolveUsageSpecies } from "@/lib/metagame/species";
import {
  emptyStatsTable,
  STAT_IDS,
  type PokemonSet,
  type StatId,
  type StatsTable,
} from "@/types/pokemon";
import type { PokemonUsage } from "@/lib/metagame/types";

/** Trim excess Stat Points from the fullest stats until the total is legal. */
function clampStatPoints(statPoints: StatsTable): StatsTable {
  const clamped = { ...statPoints };
  let total = totalStatPoints(clamped);
  while (total > MAX_SP_TOTAL) {
    let target: StatId = STAT_IDS[0];
    for (const id of STAT_IDS) {
      if (clamped[id] > clamped[target]) target = id;
    }
    if (clamped[target] <= 0) break;
    clamped[target] -= 1;
    total -= 1;
  }
  return clamped;
}

/**
 * Build the most common set from usage data: top spread, item, ability and
 * moves. Battle-only formes (Megas) become the base species holding its stone,
 * matching how the rest of the app stores them. Returns null when the species
 * is unknown or a battle-only forme cannot be represented.
 */
export function usageToSet(usage: PokemonUsage): PokemonSet | null {
  const forme = resolveUsageSpecies(usage.species);
  if (!forme) return null;
  if (forme.isBattleOnly && (!forme.baseSpecies || !forme.megaStone))
    return null;

  const species = forme.isBattleOnly ? forme.baseSpecies : forme.name;
  const item = forme.isBattleOnly
    ? forme.megaStone
    : usage.items[0]
      ? (getItem(usage.items[0].name)?.name ?? null)
      : null;

  let ability = usage.abilities[0]
    ? (getAbility(usage.abilities[0].name)?.name ?? null)
    : null;
  if (!ability) ability = forme.abilities[0] ?? null;

  const spread = usage.spreads[0];
  const nature = spread
    ? (getNature(spread.nature)?.name ?? DEFAULT_NATURE)
    : DEFAULT_NATURE;
  const statPoints = spread
    ? clampStatPoints(spread.statPoints)
    : emptyStatsTable();

  const moves = usage.moves.slice(0, 4).map((move) => move.name);

  return {
    species,
    item,
    ability,
    nature,
    statPoints,
    moves: [
      moves[0] ?? null,
      moves[1] ?? null,
      moves[2] ?? null,
      moves[3] ?? null,
    ],
  };
}
