import {
  DEFAULT_NATURE,
  getAbility,
  getItem,
  getMove,
  getNature,
  getSpecies,
  MAX_SP_PER_STAT,
  MAX_SP_TOTAL,
  totalStatPoints,
} from "@/data";
import { resolveUsageSpecies } from "@/lib/metagame/species";
import type { CommonSet } from "@/lib/metagame/common-sets";
import type { PokemonSet, StatId, StatsTable } from "@/types/pokemon";

const MOVE_SLOTS = [0, 1, 2, 3] as const;

/** Clamp one stat's points into 0..MAX_SP_PER_STAT. */
function clampStat(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(MAX_SP_PER_STAT, Math.max(0, Math.round(value)));
}

/** Trim excess Stat Points from the fullest stats until the total is legal. */
function clampStatPoints(statPoints: StatsTable): StatsTable {
  const clamped: StatsTable = {
    hp: clampStat(statPoints.hp),
    atk: clampStat(statPoints.atk),
    def: clampStat(statPoints.def),
    spa: clampStat(statPoints.spa),
    spd: clampStat(statPoints.spd),
    spe: clampStat(statPoints.spe),
  };
  let total = totalStatPoints(clamped);
  while (total > MAX_SP_TOTAL) {
    let target: StatId = "hp";
    for (const stat of Object.keys(clamped) as StatId[]) {
      if (clamped[stat] > clamped[target]) target = stat;
    }
    if (clamped[target] <= 0) break;
    clamped[target] -= 1;
    total -= 1;
  }
  return clamped;
}

/** A usage name turned into a real Champions item name, or null. */
function realItem(name: string | null, species: string): string | null {
  if (!name) return null;
  const item = getItem(name);
  // A Mega Stone only belongs on its own species; anything else the usage
  // data names must exist in the Champions item list.
  if (!item) return null;
  if (item.megaStoneFor && !item.megaStoneFor.includes(species)) return null;
  return item.name;
}

/** A usage name turned into an ability this species can actually have. */
function realAbility(name: string | null, abilities: string[]): string | null {
  if (!name) return null;
  const ability = getAbility(name);
  if (ability && abilities.includes(ability.name)) return ability.name;
  return abilities[0] ?? null;
}

/**
 * One common set turned into a legal, fillable `PokemonSet`: every usage name
 * is checked against the Champions roster first, so only real species,
 * items, abilities and moves land in the calculator. Battle-only formes
 * (Megas) become the base species holding its stone, matching how the rest
 * of the app stores them. Returns null when the species is unknown or a
 * battle-only forme cannot be represented.
 */
export function commonSetToPokemonSet(
  species: string,
  common: CommonSet,
): PokemonSet | null {
  const forme = resolveUsageSpecies(species);
  if (!forme) return null;
  if (forme.isBattleOnly && (!forme.baseSpecies || !forme.megaStone)) {
    return null;
  }

  const setSpecies = forme.isBattleOnly ? forme.baseSpecies : forme.name;
  const item = forme.isBattleOnly
    ? realItem(forme.megaStone, setSpecies)
    : realItem(common.item, setSpecies);
  // The set is stored under the base species, so the ability must be one the
  // base species can have — a Mega forme's own ability (Drought on Mega
  // Charizard Y) is not legal on the base the app keeps.
  const holder = forme.isBattleOnly ? (getSpecies(setSpecies) ?? forme) : forme;
  const ability = realAbility(common.ability, holder.abilities);
  const nature = common.nature
    ? (getNature(common.nature)?.name ?? DEFAULT_NATURE)
    : DEFAULT_NATURE;

  const moves: (string | null)[] = [];
  for (const name of common.moves) {
    if (!name) continue;
    const move = getMove(name)?.name;
    // Skip unknown names and repeats; the set stays legal either way.
    if (move && !moves.includes(move)) moves.push(move);
  }

  return {
    species: setSpecies,
    item,
    ability,
    nature,
    statPoints: clampStatPoints(common.statPoints),
    moves: MOVE_SLOTS.map((slot) => moves[slot] ?? null) as PokemonSet["moves"],
  };
}
