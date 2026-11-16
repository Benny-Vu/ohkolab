import {
  defensiveMatchups,
  getMove,
  getSpecies,
  resolveBattleForme,
  typeEffectiveness,
  validateSet,
} from "@/data";
import { TYPE_NAMES, type PokemonSet, type TypeName } from "@/types/pokemon";

/**
 * Team analysis by type chart alone: abilities (Levitate, Flash Fire...),
 * items and moves with their own type rules (Freeze-Dry, Flying Press) are
 * not considered.
 */

/** The name to show for a member: its nickname, or its species. */
export function memberLabel(set: PokemonSet): string {
  return set.nickname?.trim() || set.species;
}

/**
 * A member's types in battle. A Pokémon holding its Mega Stone counts as its
 * Mega forme, since that is the typing it fights with. Unknown species give
 * null.
 */
export function battleTypes(set: PokemonSet): TypeName[] | null {
  const forme = getSpecies(resolveBattleForme(set.species, set.item));
  return (forme ?? getSpecies(set.species))?.types ?? null;
}

export interface DefensiveEntry {
  /** The attacking type. */
  type: TypeName;
  /** Members taking more than neutral damage (2x or 4x). */
  weak: number;
  /** Members taking less than neutral damage (0.5x or 0.25x), immunities excluded. */
  resistant: number;
  /** Members taking no damage. */
  immune: number;
  /** Members taking neutral damage. */
  neutral: number;
  /** The multiplier for each member in team order; null for an unknown species. */
  multipliers: (number | null)[];
}

/** For each of the 18 attacking types: how the team takes it. */
export function defensiveOverview(
  members: readonly PokemonSet[],
): DefensiveEntry[] {
  const matchups = members.map((member) => {
    const types = battleTypes(member);
    return types ? defensiveMatchups(types) : null;
  });

  return TYPE_NAMES.map((type) => {
    const entry: DefensiveEntry = {
      type,
      weak: 0,
      resistant: 0,
      immune: 0,
      neutral: 0,
      multipliers: [],
    };
    for (const matchup of matchups) {
      const multiplier = matchup ? matchup[type] : null;
      entry.multipliers.push(multiplier);
      if (multiplier === null) continue;
      if (multiplier === 0) entry.immune += 1;
      else if (multiplier > 1) entry.weak += 1;
      else if (multiplier < 1) entry.resistant += 1;
      else entry.neutral += 1;
    }
    return entry;
  });
}

export interface CoverageEntry {
  /** The defending type. */
  type: TypeName;
  /**
   * The best multiplier any of the team's damaging moves has against this
   * type (0, 0.5, 1 or 2). Null when the team has no damaging moves.
   */
  best: number | null;
  /** The move types that reach `best`, in type-chart order. */
  moveTypes: TypeName[];
}

/** The types of the damaging moves on the team, without repeats, in type-chart order. */
export function attackingTypes(members: readonly PokemonSet[]): TypeName[] {
  const found = new Set<TypeName>();
  for (const member of members) {
    for (const name of member.moves) {
      const move = name ? getMove(name) : undefined;
      if (move && move.category !== "Status") found.add(move.type);
    }
  }
  return TYPE_NAMES.filter((type) => found.has(type));
}

/** For each of the 18 defending types: how hard the team's moves can hit it. */
export function offensiveCoverage(
  members: readonly PokemonSet[],
): CoverageEntry[] {
  const moveTypes = attackingTypes(members);
  return TYPE_NAMES.map((type) => {
    let best: number | null = null;
    let reaching: TypeName[] = [];
    for (const moveType of moveTypes) {
      const multiplier = typeEffectiveness(moveType, [type]);
      if (best === null || multiplier > best) {
        best = multiplier;
        reaching = [moveType];
      } else if (multiplier === best) {
        reaching.push(moveType);
      }
    }
    return { type, best, moveTypes: reaching };
  });
}

export interface TeamWarning {
  kind: "duplicate-species" | "duplicate-item" | "set";
  message: string;
  /** Positions of the members concerned, in team order. */
  members: number[];
}

function groupBy(
  members: readonly PokemonSet[],
  key: (member: PokemonSet) => string | null,
): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  members.forEach((member, index) => {
    const value = key(member);
    if (value === null) return;
    groups.set(value, [...(groups.get(value) ?? []), index]);
  });
  return groups;
}

/**
 * What is wrong with a team: the same species twice (formes of one species
 * count as the same, as in the games' species clause), the same held item
 * twice, and every problem `validateSet` finds in a member.
 */
export function teamWarnings(members: readonly PokemonSet[]): TeamWarning[] {
  const warnings: TeamWarning[] = [];

  const bySpecies = groupBy(
    members,
    (member) => getSpecies(member.species)?.baseSpecies ?? member.species,
  );
  for (const [species, positions] of bySpecies) {
    if (positions.length < 2) continue;
    warnings.push({
      kind: "duplicate-species",
      message: `${species} is on the team ${positions.length} times.`,
      members: positions,
    });
  }

  const byItem = groupBy(members, (member) => member.item);
  for (const [item, positions] of byItem) {
    if (positions.length < 2) continue;
    warnings.push({
      kind: "duplicate-item",
      message: `${item} is held by ${positions.length} Pokémon.`,
      members: positions,
    });
  }

  members.forEach((member, index) => {
    for (const problem of validateSet(member)) {
      warnings.push({
        kind: "set",
        message: `${memberLabel(member)}: ${problem}`,
        members: [index],
      });
    }
  });

  return warnings;
}
