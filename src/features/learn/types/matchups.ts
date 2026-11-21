import { defensiveMatchups, typeEffectiveness } from "@/data/type-chart";
import { TYPE_NAMES, type TypeName } from "@/types/pokemon";

/**
 * What one type does on attack and what happens to it on defence, derived
 * from `@/data`'s chart functions — never from a hand-copied table.
 */

/** One type's attacking and defending matchup lists. */
export interface TypeMatchups {
  /** Types this type hits for more than ×1. */
  superEffective: readonly TypeName[];
  /** Types this type hits for less than ×1 (including ×¼). */
  notVeryEffective: readonly TypeName[];
  /** Types this type can't touch at all. */
  noEffect: readonly TypeName[];
  /** Attacking types that hit this type for more than ×1. */
  weakTo: readonly TypeName[];
  /** Attacking types this type takes less than ×1 from (including ×¼). */
  resists: readonly TypeName[];
  /** Attacking types this type is immune to. */
  immuneTo: readonly TypeName[];
}

const cache = new Map<TypeName, TypeMatchups>();

/** The matchups of one type, computed once per type from `@/data`. */
export function matchupsFor(type: TypeName): TypeMatchups {
  const cached = cache.get(type);
  if (cached) return cached;

  const superEffective: TypeName[] = [];
  const notVeryEffective: TypeName[] = [];
  const noEffect: TypeName[] = [];
  for (const defending of TYPE_NAMES) {
    const multiplier = typeEffectiveness(type, [defending]);
    if (multiplier === 0) noEffect.push(defending);
    else if (multiplier > 1) superEffective.push(defending);
    else if (multiplier < 1) notVeryEffective.push(defending);
  }

  const weakTo: TypeName[] = [];
  const resists: TypeName[] = [];
  const immuneTo: TypeName[] = [];
  for (const [attacking, multiplier] of Object.entries(
    defensiveMatchups([type]),
  )) {
    if (multiplier === 0) immuneTo.push(attacking as TypeName);
    else if (multiplier > 1) weakTo.push(attacking as TypeName);
    else if (multiplier < 1) resists.push(attacking as TypeName);
  }

  const matchups: TypeMatchups = {
    superEffective,
    notVeryEffective,
    noEffect,
    weakTo,
    resists,
    immuneTo,
  };
  cache.set(type, matchups);
  return matchups;
}
