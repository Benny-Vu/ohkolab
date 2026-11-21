import { describe, expect, it } from "vitest";

import { getAbility } from "@/data/abilities";
import { calculateDamage } from "@/data/damage";
import { getMove } from "@/data/moves";
import { TYPE_TRAITS } from "@/features/learn/types/type-traits";
import {
  battlerFromSet,
  emptyField,
  type FieldState,
  type Weather,
} from "@/types/battle";
import {
  emptyStatsTable,
  type PokemonSet,
  type TypeName,
} from "@/types/pokemon";

/**
 * Where every trait in `type-traits.ts` comes from, checked against
 * Champions as the app models it, all through `@/data` (the ESLint
 * boundary keeps the Pokémon libraries inside `src/data`, so the tests
 * use its public functions): `calculateDamage` for the calc generation 0
 * mechanics, and `getMove`/`getAbility` for the @pkmn/dex SV data.
 */

/** A minimal level-50 set: the ratios, not the stats, are what matter. */
function set(species: string, ability?: string): PokemonSet {
  return {
    species,
    nickname: undefined,
    item: null,
    ability: ability ?? null,
    nature: "Serious",
    statPoints: emptyStatsTable(),
    moves: [null, null, null, null],
  };
}

/** The damage range of one move under one weather or terrain. */
function damageRange(
  attacker: PokemonSet,
  defender: PokemonSet,
  moveName: string,
  overrides?: { weather?: Weather; terrain?: FieldState["terrain"] },
): { min: number; max: number } {
  const field = emptyField("singles");
  field.weather = overrides?.weather ?? null;
  field.terrain = overrides?.terrain ?? null;
  const result = calculateDamage(
    battlerFromSet(attacker),
    battlerFromSet(defender),
    moveName,
    field,
  );
  return { min: result.min, max: result.max };
}

describe("the weather defense boosts (calc generation 0)", () => {
  it("an Ice type takes less physical damage in snow (1.5× Defense)", () => {
    // Abomasnow is a Champions Ice type; Earthquake is a physical hit.
    const clear = damageRange(set("Chimecho"), set("Abomasnow"), "Earthquake");
    const snow = damageRange(set("Chimecho"), set("Abomasnow"), "Earthquake", {
      weather: "Snow",
    });
    // 1.5× Defense means roughly two thirds of the damage: the snow
    // rolls never reach even the lowest clear roll.
    expect(snow.max).toBeLessThan(clear.min);
  });

  it("a Rock type takes less special damage in sand (1.5× SpD)", () => {
    // Aerodactyl is a Champions Rock type; Flash Cannon is a special hit.
    const clear = damageRange(
      set("Chimecho"),
      set("Aerodactyl"),
      "Flash Cannon",
    );
    const sand = damageRange(
      set("Chimecho"),
      set("Aerodactyl"),
      "Flash Cannon",
      {
        weather: "Sand",
      },
    );
    expect(sand.max).toBeLessThan(clear.min);
  });

  it("the SV data agrees: Snowscape and Sandstorm name the same boosts", () => {
    expect(getMove("Snowscape")?.shortDesc).toContain("1.5× Def");
    expect(getMove("Sandstorm")?.shortDesc).toContain("1.5× SpD");
  });
});

describe("groundedness (Flying, and Levitate on any type)", () => {
  it("Electric Terrain boosts a grounded attacker (the control)", () => {
    // Abomasnow is grounded; Thunderbolt is Electric, so Electric
    // Terrain lifts its power. Without this, the skips below prove
    // nothing.
    const clear = damageRange(set("Abomasnow"), set("Chimecho"), "Thunderbolt");
    const terrain = damageRange(
      set("Abomasnow"),
      set("Chimecho"),
      "Thunderbolt",
      { terrain: "Electric" },
    );
    expect(terrain.max).toBeGreaterThan(clear.max);
  });

  it("Electric Terrain's boost skips a Flying attacker", () => {
    // Aerodactyl is a Champions Flying type.
    const clear = damageRange(
      set("Aerodactyl"),
      set("Abomasnow"),
      "Thunderbolt",
    );
    const terrain = damageRange(
      set("Aerodactyl"),
      set("Abomasnow"),
      "Thunderbolt",
      { terrain: "Electric" },
    );
    // Not grounded: the terrain makes no difference at all.
    expect(terrain).toEqual(clear);
  });

  it("Electric Terrain's boost skips a Levitate holder", () => {
    // Abomasnow grounded gets the boost; with Levitate it does not.
    const grounded = damageRange(
      set("Abomasnow"),
      set("Chimecho"),
      "Thunderbolt",
      { terrain: "Electric" },
    );
    const levitating = damageRange(
      set("Abomasnow", "Levitate"),
      set("Chimecho"),
      "Thunderbolt",
      { terrain: "Electric" },
    );
    expect(levitating.max).toBeLessThan(grounded.max);
  });

  it("the grounded-only hazards in the data say so, and exist in Champions", () => {
    for (const name of ["Spikes", "Toxic Spikes", "Sticky Web"]) {
      const move = getMove(name);
      expect(move).toBeDefined();
      expect(move?.shortDesc).toMatch(/grounded/);
    }
  });

  it("Arena Trap is not in Champions, so the Flying card never cites it", () => {
    expect(getAbility("Arena Trap")).toBeUndefined();
  });
});

describe("the move and ability facts (@pkmn/dex, and in Champions)", () => {
  it("Sheer Cold OHKOs only non-Ice targets, and is a Champions move", () => {
    expect(getMove("Sheer Cold")?.shortDesc).toMatch(/non-Ice/);
  });

  it("Toxic from a Poison type can't miss, and is a Champions move", () => {
    expect(getMove("Toxic")?.shortDesc).toMatch(/can't miss/);
  });

  it("Prankster's status moves fail against Dark types", () => {
    expect(getAbility("Prankster")?.shortDesc).toMatch(/Dark types are immune/);
  });

  it("Levitate is a Champions ability", () => {
    expect(getAbility("Levitate")).toBeDefined();
  });
});

describe("the traits data follows the verification", () => {
  it("only the five types with verified traits have entries", () => {
    expect(Object.keys(TYPE_TRAITS).sort()).toEqual([
      "Dark",
      "Flying",
      "Ice",
      "Poison",
      "Rock",
    ]);
    // Everything the chart shows stays in the cards' matchup rows; the
    // trait lines never restate matchup multipliers.
    for (const type of Object.keys(TYPE_TRAITS) as TypeName[]) {
      for (const trait of TYPE_TRAITS[type] ?? []) {
        expect(trait.en).not.toMatch(/×\d/);
      }
    }
  });
});
