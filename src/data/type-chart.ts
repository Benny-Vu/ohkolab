import { gen, toID } from "@/data/gen";
import { TYPE_NAMES, type TypeName } from "@/types/pokemon";

/**
 * Damage multiplier of an attacking type against a defender's type(s):
 * 0, 0.25, 0.5, 1, 2 or 4. Abilities and items are not considered.
 */
export function typeEffectiveness(
  attacking: TypeName,
  defending: readonly TypeName[],
): number {
  const chart = gen.types.get(toID(attacking))?.effectiveness;
  if (!chart) return 1;
  return defending.reduce((total, type) => total * (chart[type] ?? 1), 1);
}

/** Multiplier of every attacking type against a defender's type(s). */
export function defensiveMatchups(
  defending: readonly TypeName[],
): Record<TypeName, number> {
  const result = {} as Record<TypeName, number>;
  for (const attacking of TYPE_NAMES) {
    result[attacking] = typeEffectiveness(attacking, defending);
  }
  return result;
}
