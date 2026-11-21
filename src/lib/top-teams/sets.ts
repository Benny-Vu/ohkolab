import { DEFAULT_NATURE, getNature, getSpecies } from "@/data";
import { clampStatPoints } from "@/lib/metagame/clamp";
import { resolveUsageSpecies } from "@/lib/metagame/species";
import type { PokemonUsage } from "@/lib/metagame/types";
import type { TopTeamMember } from "@/lib/top-teams/types";
import { emptyStatsTable, type PokemonSet } from "@/types/pokemon";

/**
 * Builds the app's set shape from a published team-sheet member. The
 * sheet publishes no Stat Points, so the set borrows the species' most
 * common SP spread from the usage data when one exists, else a neutral
 * default — and says so (`spSource`), because a presented spread that is
 * not the player's own must never read as fact.
 */

/** Where a built set's Stat Points come from. */
export type SpSource = "usage" | "neutral";

/** One member as a buildable set, with the SP honesty flag. */
export interface TopTeamSet {
  set: PokemonSet;
  spSource: SpSource;
}

/**
 * The member as the app's set shape. Returns null when the species does
 * not resolve against `@/data` (the ingest already dropped those; this
 * guards the committed file the same way).
 */
export function topTeamMemberToSet(
  member: TopTeamMember,
  usage: PokemonUsage | null,
): TopTeamSet | null {
  const forme = resolveUsageSpecies(member.species);
  if (!forme) return null;
  // Battle-only formes (Mega) are kept as the base species holding the
  // stone, matching the app's model; the sheet's item already is the stone.
  if (forme.isBattleOnly && (!forme.baseSpecies || !forme.megaStone)) {
    return null;
  }
  const species = forme.isBattleOnly ? forme.baseSpecies : forme.name;
  const holder = forme.isBattleOnly ? (getSpecies(species) ?? forme) : forme;

  const nature = getNature(member.nature)?.name ?? DEFAULT_NATURE;

  // The SP fallback: the species' most common spread from usage data.
  const spread = usage?.spreads[0];
  const statPoints = spread
    ? clampStatPoints(spread.statPoints)
    : emptyStatsTable();

  const moves: Array<string | null> = member.moves.slice(0, 4);
  return {
    set: {
      species,
      item: member.item,
      ability: holder.abilities.includes(member.ability)
        ? member.ability
        : (holder.abilities[0] ?? member.ability),
      nature,
      statPoints,
      moves: [
        moves[0] ?? null,
        moves[1] ?? null,
        moves[2] ?? null,
        moves[3] ?? null,
      ],
    },
    spSource: spread ? "usage" : "neutral",
  };
}
