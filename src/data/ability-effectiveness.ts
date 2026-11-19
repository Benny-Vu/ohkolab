import { toID } from "@/data/gen";
import { typeEffectiveness } from "@/data/type-chart";
import type { TypeName } from "@/types/pokemon";

/**
 * How one ability bends the type chart for its holder, as `@smogon/calc`
 * models it for Champions battles (see its `mechanics/champions.js`): an
 * override with multiplier 0 is an immunity, any other value scales the
 * type-chart multiplier (0.5 halves the damage, 1.25 makes it worse).
 *
 * Every entry here is validated against `calculateDamage` in
 * `ability-effectiveness.test.ts`, so the analysis never claims an effect
 * the damage calculator does not apply. Abilities that change
 * effectiveness by move flags instead of type (Bulletproof, Soundproof,
 * Queenly Majesty, Armor Tail) are out of scope for a type heat map.
 */

/** One attacking type an ability treats differently from the type chart. */
export interface AbilityTypeOverride {
  /** The attacking type the override applies to. */
  type: TypeName;
  /** 0 for an immunity; otherwise a factor the chart multiplier scales by. */
  multiplier: number;
}

interface AbilityOverrideEntry {
  /** The ability's canonical display name, e.g. "Flash Fire". */
  name: string;
  overrides: AbilityTypeOverride[];
}

const ABILITY_OVERRIDES: AbilityOverrideEntry[] = [
  {
    name: "Levitate",
    overrides: [{ type: "Ground", multiplier: 0 }],
  },
  {
    name: "Flash Fire",
    overrides: [{ type: "Fire", multiplier: 0 }],
  },
  {
    name: "Water Absorb",
    overrides: [{ type: "Water", multiplier: 0 }],
  },
  {
    name: "Volt Absorb",
    overrides: [{ type: "Electric", multiplier: 0 }],
  },
  {
    name: "Sap Sipper",
    overrides: [{ type: "Grass", multiplier: 0 }],
  },
  {
    name: "Lightning Rod",
    overrides: [{ type: "Electric", multiplier: 0 }],
  },
  {
    name: "Motor Drive",
    overrides: [{ type: "Electric", multiplier: 0 }],
  },
  {
    name: "Earth Eater",
    overrides: [{ type: "Ground", multiplier: 0 }],
  },
  {
    name: "Thick Fat",
    overrides: [
      { type: "Fire", multiplier: 0.5 },
      { type: "Ice", multiplier: 0.5 },
    ],
  },
  {
    name: "Heatproof",
    overrides: [{ type: "Fire", multiplier: 0.5 }],
  },
  {
    name: "Water Bubble",
    overrides: [{ type: "Fire", multiplier: 0.5 }],
  },
  {
    name: "Purifying Salt",
    overrides: [{ type: "Ghost", multiplier: 0.5 }],
  },
  {
    name: "Dry Skin",
    overrides: [
      { type: "Water", multiplier: 0 },
      { type: "Fire", multiplier: 1.25 },
    ],
  },
];

const BY_ID = new Map(
  ABILITY_OVERRIDES.map((entry) => [toID(entry.name), entry.overrides]),
);

/** The abilities with type-chart overrides, canonical display names. */
export const ABILITY_TYPE_OVERRIDE_NAMES: readonly string[] =
  ABILITY_OVERRIDES.map((entry) => entry.name);

/**
 * The type-chart overrides of one ability, by name or id ("Flash Fire",
 * "flashfire"). Unknown abilities give an empty list.
 */
export function abilityTypeOverrides(
  ability: string | null | undefined,
): readonly AbilityTypeOverride[] {
  if (!ability) return [];
  return BY_ID.get(toID(ability)) ?? [];
}

/** The override an ability has for one attacking type, if any. */
export function abilityOverrideFor(
  ability: string | null | undefined,
  attacking: TypeName,
): AbilityTypeOverride | undefined {
  return abilityTypeOverrides(ability).find(
    (override) => override.type === attacking,
  );
}

/**
 * How hard an attacking type hits a defender with this ability's types:
 * the type-chart multiplier scaled by the ability's override. A chart
 * immunity stays an immunity. Matches what `calculateDamage` does with
 * the same set for the moves the override covers (Gravity, which cancels
 * Levitate, is a battle state the team analysis does not model).
 */
export function abilityAdjustedEffectiveness(
  ability: string | null | undefined,
  attacking: TypeName,
  defending: readonly TypeName[],
): number {
  const chart = typeEffectiveness(attacking, defending);
  const override = abilityOverrideFor(ability, attacking);
  if (!override || chart === 0) return chart;
  return override.multiplier === 0 ? 0 : chart * override.multiplier;
}
