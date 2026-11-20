import {
  defensiveMatchups,
  getMove,
  getSpecies,
  resolveBattleForme,
  typeEffectiveness,
  validateSet,
} from "@/data";
import {
  abilityOverrideFor,
  type AbilityTypeOverride,
} from "@/data/ability-effectiveness";
import { TYPE_NAMES, type PokemonSet, type TypeName } from "@/types/pokemon";

/**
 * Team analysis by type chart, with the abilities `@smogon/calc` itself
 * models for Champions (Levitate, Flash Fire, Thick Fat...) bending the
 * chart where the set names them — the same ability the calc would apply
 * to that set, so the two never disagree. Items, moves with their own type
 * rules (Freeze-Dry, Flying Press) and battle states (Gravity) are not
 * considered.
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
  /**
   * For each member: the ability that changed its matchup against this
   * attacking type (its display name, e.g. "Levitate"), or null when no
   * tracked ability applied. Never set when the type chart already made
   * the member immune.
   */
  abilityNotes: (string | null)[];
}

/** For each of the 18 attacking types: how the team takes it. */
export function defensiveOverview(
  members: readonly PokemonSet[],
): DefensiveEntry[] {
  const matchups = members.map((member) => {
    const types = battleTypes(member);
    if (!types) return null;
    return { chart: defensiveMatchups(types), ability: member.ability };
  });

  return TYPE_NAMES.map((type) => {
    const entry: DefensiveEntry = {
      type,
      weak: 0,
      resistant: 0,
      immune: 0,
      neutral: 0,
      multipliers: [],
      abilityNotes: [],
    };
    for (const matchup of matchups) {
      if (!matchup) {
        entry.multipliers.push(null);
        entry.abilityNotes.push(null);
        continue;
      }
      const chart = matchup.chart[type];
      const override = abilityOverrideFor(matchup.ability, type);
      const multiplier = !override
        ? chart
        : override.multiplier === 0
          ? 0
          : chart * override.multiplier;
      entry.multipliers.push(multiplier);
      entry.abilityNotes.push(override && chart !== 0 ? matchup.ability : null);
      if (multiplier === 0) entry.immune += 1;
      else if (multiplier > 1) entry.weak += 1;
      else if (multiplier < 1) entry.resistant += 1;
      else entry.neutral += 1;
    }
    return entry;
  });
}

/** One matchup an ability changed for one member, as structured data. */
export interface AbilityMatchupNote {
  /** The member's position in team order. */
  member: number;
  /** The attacking type the ability changed the matchup against. */
  type: TypeName;
  /** The ability's name as stored on the set, e.g. "Levitate". */
  ability: string;
  /** How the ability changed the matchup. */
  effect: "immune" | "resist" | "weak";
}

function noteEffect(
  override: AbilityTypeOverride,
): AbilityMatchupNote["effect"] {
  if (override.multiplier === 0) return "immune";
  return override.multiplier < 1 ? "resist" : "weak";
}

/**
 * Every matchup an ability changed, member by member, for the analysis
 * panel to name ("Ground — immune via Levitate").
 */
export function abilityMatchupNotes(
  members: readonly PokemonSet[],
): AbilityMatchupNote[] {
  const overview = defensiveOverview(members);
  const notes: AbilityMatchupNote[] = [];
  members.forEach((_, member) => {
    for (const entry of overview) {
      const ability = entry.abilityNotes[member];
      if (!ability) continue;
      const override = abilityOverrideFor(ability, entry.type);
      if (!override) continue;
      notes.push({
        member,
        type: entry.type,
        ability,
        effect: noteEffect(override),
      });
    }
  });
  return notes;
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

/** A defending type no team move hits super-effectively. */
export interface CoverageGap {
  type: TypeName;
  /** The best multiplier the team reaches against the type (0, 0.5 or 1). */
  best: number;
}

/**
 * The team's offensive coverage gaps: every defending type none of the
 * team's move types hits super-effectively. A team with no damaging moves
 * has no gaps to report — there is nothing to measure.
 */
export function coverageGaps(members: readonly PokemonSet[]): CoverageGap[] {
  return offensiveCoverage(members).flatMap((entry) =>
    entry.best !== null && entry.best < 2
      ? [{ type: entry.type, best: entry.best }]
      : [],
  );
}

/**
 * A warning's words, as a translation key plus its params: the page that
 * renders the warning passes both to `t()`, so each locale can word the
 * sentence its own way. `teams.warnSetProblem` embeds the data layer's
 * validation sentence, which stays as-is.
 */
type TeamWarningMessage =
  | {
      key: "teams.warnDuplicateSpecies";
      params: { name: string; count: number };
    }
  | {
      key: "teams.warnDuplicateItem";
      params: { name: string; count: number };
    }
  | {
      key: "teams.warnSetProblem";
      params: { name: string; problem: string };
    };

export interface TeamWarning {
  kind: "duplicate-species" | "duplicate-item" | "set";
  message: TeamWarningMessage;
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
      message: {
        key: "teams.warnDuplicateSpecies",
        params: { name: species, count: positions.length },
      },
      members: positions,
    });
  }

  const byItem = groupBy(members, (member) => member.item);
  for (const [item, positions] of byItem) {
    if (positions.length < 2) continue;
    warnings.push({
      kind: "duplicate-item",
      message: {
        key: "teams.warnDuplicateItem",
        params: { name: item, count: positions.length },
      },
      members: positions,
    });
  }

  members.forEach((member, index) => {
    for (const problem of validateSet(member)) {
      warnings.push({
        kind: "set",
        message: {
          key: "teams.warnSetProblem",
          params: { name: memberLabel(member), problem },
        },
        members: [index],
      });
    }
  });

  return warnings;
}
