import { describe, expect, it } from "vitest";

import {
  calculateDamage,
  createDefaultSet,
  getSpecies,
  listSpecies,
} from "@/data";
import {
  ABILITY_TYPE_OVERRIDE_NAMES,
  abilityAdjustedEffectiveness,
  abilityTypeOverrides,
} from "@/data/ability-effectiveness";
import { battlerFromSet, emptyField, type BattlerState } from "@/types/battle";

/**
 * Every ability the override table claims is proven here against
 * `calculateDamage`: the ability must change the damage the calc actually
 * computes, on a species from the Champions roster that can have it. If
 * `@smogon/calc` does not apply an ability, it does not belong in the
 * table, and the analysis must not pretend it does.
 */

/** An ability with no type-chart effect, as the no-ability control. */
const NEUTRAL_ABILITY = "Sturdy";

interface CalcCase {
  ability: string;
  /** A pickable Champions species that can have the ability. */
  species: string;
  /** The attacking move the calc runs. */
  move: string;
  category: "physical" | "special";
  /** What the ability should do to the damage. */
  effect: "immune" | "halved" | "amplified";
}

const IMMUNE_CASES: CalcCase[] = [
  {
    ability: "Levitate",
    species: "Rotom-Wash",
    move: "Earthquake",
    category: "physical",
    effect: "immune",
  },
  {
    ability: "Flash Fire",
    species: "Arcanine",
    move: "Flamethrower",
    category: "special",
    effect: "immune",
  },
  {
    ability: "Water Absorb",
    species: "Vaporeon",
    move: "Surf",
    category: "special",
    effect: "immune",
  },
  {
    ability: "Volt Absorb",
    species: "Jolteon",
    move: "Thunderbolt",
    category: "special",
    effect: "immune",
  },
  {
    ability: "Sap Sipper",
    species: "Azumarill",
    move: "Energy Ball",
    category: "special",
    effect: "immune",
  },
  {
    ability: "Lightning Rod",
    species: "Pikachu",
    move: "Thunderbolt",
    category: "special",
    effect: "immune",
  },
  {
    ability: "Motor Drive",
    species: "Emolga",
    move: "Thunderbolt",
    category: "special",
    effect: "immune",
  },
  {
    ability: "Earth Eater",
    species: "Orthworm",
    move: "Earthquake",
    category: "physical",
    effect: "immune",
  },
  {
    ability: "Dry Skin",
    species: "Toxicroak",
    move: "Surf",
    category: "special",
    effect: "immune",
  },
];

const SCALING_CASES: CalcCase[] = [
  {
    ability: "Thick Fat",
    species: "Mamoswine",
    move: "Flamethrower",
    category: "special",
    effect: "halved",
  },
  {
    ability: "Heatproof",
    species: "Sinistcha",
    move: "Flamethrower",
    category: "special",
    effect: "halved",
  },
  {
    ability: "Water Bubble",
    species: "Araquanid",
    move: "Flamethrower",
    category: "special",
    effect: "halved",
  },
  {
    ability: "Purifying Salt",
    species: "Garganacl",
    move: "Shadow Ball",
    category: "special",
    effect: "halved",
  },
  {
    ability: "Dry Skin",
    species: "Toxicroak",
    move: "Flamethrower",
    category: "special",
    effect: "amplified",
  },
];

function defender(species: string, ability: string | null): BattlerState {
  return battlerFromSet({ ...createDefaultSet(species), ability });
}

function attacker(
  move: string,
  category: "physical" | "special",
): BattlerState {
  const set = createDefaultSet(category === "special" ? "Gengar" : "Garchomp");
  const statPoints = {
    hp: 32,
    atk: category === "physical" ? 32 : 0,
    def: 0,
    spa: category === "special" ? 32 : 0,
    spd: 0,
    spe: 0,
  };
  return battlerFromSet({
    ...set,
    statPoints,
    moves: [move, null, null, null],
  });
}

const FIELD = emptyField("doubles");

function maxDamage(
  defenderSet: BattlerState,
  move: string,
  category: CalcCase["category"],
): number {
  return calculateDamage(attacker(move, category), defenderSet, move, FIELD)
    .max;
}

describe("the ability override table", () => {
  it("only lists abilities the Champions roster can actually have", () => {
    const pickable = listSpecies();
    expect(ABILITY_TYPE_OVERRIDE_NAMES.length).toBeGreaterThan(0);
    for (const name of ABILITY_TYPE_OVERRIDE_NAMES) {
      const holder = pickable.find((info) => info.abilities.includes(name));
      expect(holder, `${name} has no holder in the roster`).toBeDefined();
    }
  });

  it("looks abilities up by name or id, case-insensitively", () => {
    expect(abilityTypeOverrides("Flash Fire")).toEqual(
      abilityTypeOverrides("flashfire"),
    );
    expect(abilityTypeOverrides(null)).toEqual([]);
    expect(abilityTypeOverrides("Intimidate")).toEqual([]);
  });
});

describe("immunity abilities, validated through the calc", () => {
  for (const testCase of IMMUNE_CASES) {
    it(`${testCase.ability} takes no damage from ${testCase.move}`, () => {
      expect(getSpecies(testCase.species)?.abilities).toContain(
        testCase.ability,
      );
      const withAbility = maxDamage(
        defender(testCase.species, testCase.ability),
        testCase.move,
        testCase.category,
      );
      const without = maxDamage(
        defender(testCase.species, NEUTRAL_ABILITY),
        testCase.move,
        testCase.category,
      );
      expect(without).toBeGreaterThan(0);
      expect(withAbility).toBe(0);
    });
  }
});

describe("damage-scaling abilities, validated through the calc", () => {
  for (const testCase of SCALING_CASES) {
    it(`${testCase.ability} ${testCase.effect === "halved" ? "halves" : "amplifies"} damage from ${testCase.move}`, () => {
      expect(getSpecies(testCase.species)?.abilities).toContain(
        testCase.ability,
      );
      const withAbility = maxDamage(
        defender(testCase.species, testCase.ability),
        testCase.move,
        testCase.category,
      );
      const without = maxDamage(
        defender(testCase.species, NEUTRAL_ABILITY),
        testCase.move,
        testCase.category,
      );
      expect(without).toBeGreaterThan(0);
      expect(withAbility).toBeGreaterThan(0);
      if (testCase.effect === "halved") {
        expect(withAbility).toBeLessThan(without);
      } else {
        expect(withAbility).toBeGreaterThan(without);
      }
    });
  }
});

describe("abilityAdjustedEffectiveness", () => {
  it("turns the chart multiplier into an immunity", () => {
    // Rotom-Wash: Water/Electric, normally hit by Ground.
    expect(
      abilityAdjustedEffectiveness("Levitate", "Ground", ["Water", "Electric"]),
    ).toBe(0);
  });

  it("scales weaknesses and resistances by the override", () => {
    // Mamoswine: Ice/Ground. Fire is 2x, halved to 1x by Thick Fat; Ice
    // is 1x (0.5 against Ice, 2 against Ground), halved to 0.5x.
    expect(
      abilityAdjustedEffectiveness("Thick Fat", "Fire", ["Ice", "Ground"]),
    ).toBe(1);
    expect(
      abilityAdjustedEffectiveness("Thick Fat", "Ice", ["Ice", "Ground"]),
    ).toBe(0.5);
  });

  it("amplifies Dry Skin's Fire damage", () => {
    // Toxicroak: Poison/Fighting, neutral to Fire.
    expect(
      abilityAdjustedEffectiveness("Dry Skin", "Fire", ["Poison", "Fighting"]),
    ).toBe(1.25);
  });

  it("keeps a chart immunity and passes untouched types through", () => {
    expect(
      abilityAdjustedEffectiveness("Levitate", "Ground", ["Fire", "Flying"]),
    ).toBe(0);
    expect(
      abilityAdjustedEffectiveness("Levitate", "Rock", ["Water", "Electric"]),
    ).toBe(1);
    expect(
      abilityAdjustedEffectiveness("Heatproof", "Water", ["Grass", "Ghost"]),
    ).toBe(0.5);
  });
});
