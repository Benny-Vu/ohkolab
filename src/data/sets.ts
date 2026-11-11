import { getItem } from "@/data/items";
import { getMove } from "@/data/moves";
import { DEFAULT_NATURE, getNature } from "@/data/natures";
import { getSpecies } from "@/data/species";
import { MAX_SP_PER_STAT, MAX_SP_TOTAL, totalStatPoints } from "@/data/stats";
import {
  emptyStatsTable,
  STAT_IDS,
  STAT_LABELS,
  type PokemonSet,
} from "@/types/pokemon";

/** A blank set for a species: first ability, neutral nature, no item, moves or Stat Points. */
export function createDefaultSet(species: string): PokemonSet {
  const info = getSpecies(species);
  return {
    species: info?.name ?? species,
    item: null,
    ability: info?.abilities[0] ?? null,
    nature: DEFAULT_NATURE,
    statPoints: emptyStatsTable(),
    moves: [null, null, null, null],
  };
}

/**
 * Problems that make a set illegal or unusable, as short human-readable
 * sentences. An empty array means the set is valid.
 */
export function validateSet(set: PokemonSet): string[] {
  const problems: string[] = [];

  const info = getSpecies(set.species);
  if (!info) {
    problems.push(`${set.species} is not in Pokémon Champions.`);
    return problems;
  }
  if (set.ability && !info.abilities.includes(set.ability)) {
    problems.push(`${info.name} cannot have the ability ${set.ability}.`);
  }
  if (set.item) {
    const item = getItem(set.item);
    if (!item)
      problems.push(`${set.item} is not an item in Pokémon Champions.`);
    else if (item.megaStoneFor && !item.megaStoneFor.includes(info.name)) {
      problems.push(`${info.name} cannot use ${item.name}.`);
    }
  }
  if (!getNature(set.nature)) problems.push(`${set.nature} is not a nature.`);

  for (const stat of STAT_IDS) {
    const points = set.statPoints[stat];
    if (!Number.isInteger(points) || points < 0 || points > MAX_SP_PER_STAT) {
      problems.push(
        `${STAT_LABELS[stat]} Stat Points must be between 0 and ${MAX_SP_PER_STAT}.`,
      );
    }
  }
  const total = totalStatPoints(set.statPoints);
  if (total > MAX_SP_TOTAL) {
    problems.push(`${total} Stat Points spent; the limit is ${MAX_SP_TOTAL}.`);
  }

  const chosen = set.moves.filter((move): move is string => move !== null);
  for (const move of chosen) {
    if (!getMove(move))
      problems.push(`${move} is not a move in Pokémon Champions.`);
  }
  if (new Set(chosen).size !== chosen.length)
    problems.push("The same move is chosen twice.");

  return problems;
}
