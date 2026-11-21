import { describe, expect, it } from "vitest";

import {
  LEARN_ENTRIES,
  LEARN_SECTIONS,
  entriesForSection,
} from "@/features/learn/guides";
import {
  calculateDamage,
  createDefaultSet,
  getAbility,
  getItem,
  getMove,
} from "@/data";
import {
  battlerFromSet,
  emptyField,
  type BattlerState,
  type FieldState,
  type SideState,
} from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

/**
 * The learn content's own guardrails. Two halves:
 *
 * 1. Registry sanity — every entry is addressable, EN and JA stay the same
 *    shape, and the vocabulary covers the terms the brief requires.
 * 2. Mechanics — every number the entries cite, pinned against the game as
 *    the app models it: `@smogon/calc` generation 0 (through `@/data`) and
 *    the `@pkmn/dex` descriptions the move and item entries quote.
 */

// --- helpers -------------------------------------------------------------

const F = emptyField("doubles");

function set(species: string, overrides: Partial<PokemonSet> = {}): PokemonSet {
  return { ...createDefaultSet(species), ...overrides };
}

function ratio(
  base: { min: number; max: number },
  mod: { min: number; max: number },
): number {
  return mod.max / base.max;
}

/** Close to `expected`, allowing the integer flooring of damage rolls. */
function near(actual: number, expected: number, tolerance = 0.05): void {
  expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
}

function dmg(
  attacker: PokemonSet,
  defender: PokemonSet,
  move: string,
  field: Partial<FieldState> = {},
  battlerOverrides: Partial<BattlerState> = {},
  defenderSide: Partial<SideState> = {},
) {
  const fieldState: FieldState = {
    ...F,
    ...field,
    attackerSide: field.attackerSide ?? F.attackerSide,
    defenderSide: { ...F.defenderSide, ...defenderSide },
  };
  return calculateDamage(
    { ...battlerFromSet(attacker), ...battlerOverrides },
    battlerFromSet(defender),
    move,
    fieldState,
  );
}

const charizard = (): PokemonSet => ({
  ...createDefaultSet("Charizard"),
  ability: "Blaze",
});
const garchomp = (): PokemonSet => ({
  ...createDefaultSet("Garchomp"),
  ability: "Rough Skin",
});
const snorlax = (): PokemonSet => ({
  ...createDefaultSet("Snorlax"),
  ability: "Immunity",
});
const incineroar = (): PokemonSet => ({
  ...createDefaultSet("Incineroar"),
  ability: "Intimidate",
});

// --- registry sanity -------------------------------------------------------

describe("learn registry", () => {
  it("has unique slugs that never collide with a section id", () => {
    const slugs = LEARN_ENTRIES.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const sectionIds = LEARN_SECTIONS.map((section) => section.id);
    for (const slug of slugs) {
      expect(sectionIds).not.toContain(slug);
    }
  });

  it("keeps EN and JA the same shape", () => {
    for (const entry of LEARN_ENTRIES) {
      expect(entry.title.en.length, entry.slug).toBeGreaterThan(0);
      expect(entry.title.ja.length, entry.slug).toBeGreaterThan(0);
      expect(entry.summary.en.length, entry.slug).toBeGreaterThan(0);
      expect(entry.summary.ja.length, entry.slug).toBeGreaterThan(0);
      expect(entry.body.ja.length, entry.slug).toBe(entry.body.en.length);
      for (const [locale, paragraphs] of Object.entries(entry.body)) {
        for (const paragraph of paragraphs) {
          expect(
            paragraph.trim().length,
            `${entry.slug} ${locale}`,
          ).toBeGreaterThan(0);
          expect(paragraph, `${entry.slug} ${locale}`).not.toMatch(/[…]/);
        }
      }
    }
  });

  it("covers every vocabulary term the brief requires", () => {
    const required = [
      "2hko",
      "back",
      "bring-4",
      "chip-damage",
      "fake-out",
      "guaranteed",
      "intimidate-term",
      "lead",
      "mega-evolution-term",
      "nature",
      "ohko-term",
      "pivot",
      "priority",
      "protect",
      "roll",
      "set",
      "sp",
      "speed-control-term",
      "speed-tie",
      "spread",
      "spread-move",
      "stab",
      "tailwind-term",
      "team-preview-term",
      "trick-room-term",
    ];
    const slugs = new Set(
      entriesForSection("vocabulary").map((entry) => entry.slug),
    );
    for (const slug of required) {
      expect(slugs.has(slug), slug).toBe(true);
    }
    for (const entry of entriesForSection("vocabulary")) {
      expect(entry.long).toBe(false);
    }
  });
});

// --- mechanics -------------------------------------------------------------

describe("weather numbers cited in the field entries", () => {
  it("sun powers Fire 1.5× and cuts Water to 0.5×", () => {
    const fire = dmg(charizard(), snorlax(), "Flamethrower");
    const water = dmg(charizard(), snorlax(), "Surf");
    near(
      ratio(
        fire,
        dmg(charizard(), snorlax(), "Flamethrower", { weather: "Sun" }),
      ),
      1.5,
    );
    near(
      ratio(water, dmg(charizard(), snorlax(), "Surf", { weather: "Sun" })),
      0.5,
    );
    near(
      ratio(
        fire,
        dmg(charizard(), snorlax(), "Flamethrower", { weather: "Rain" }),
      ),
      0.5,
    );
    near(
      ratio(water, dmg(charizard(), snorlax(), "Surf", { weather: "Rain" })),
      1.5,
    );
  });

  it("sandstorm gives Rock 1.5× Special Defence and nothing physical", () => {
    const tyranitar = set("Tyranitar", { ability: "Sand Stream" });
    const special = dmg(garchomp(), tyranitar, "Earth Power");
    const physical = dmg(garchomp(), tyranitar, "Earthquake");
    near(
      ratio(
        special,
        dmg(garchomp(), tyranitar, "Earth Power", { weather: "Sand" }),
      ),
      2 / 3,
    );
    expect(
      ratio(
        physical,
        dmg(garchomp(), tyranitar, "Earthquake", { weather: "Sand" }),
      ),
    ).toBe(1);
  });

  it("snow gives Ice 1.5× Defence and nothing special", () => {
    const abomasnow = set("Abomasnow", { ability: "Snow Warning" });
    const physical = dmg(garchomp(), abomasnow, "Earthquake");
    const special = dmg(garchomp(), abomasnow, "Earth Power");
    near(
      ratio(
        physical,
        dmg(garchomp(), abomasnow, "Earthquake", { weather: "Snow" }),
      ),
      2 / 3,
    );
    expect(
      ratio(
        special,
        dmg(garchomp(), abomasnow, "Earth Power", { weather: "Snow" }),
      ),
    ).toBe(1);
  });

  it("states the durations and rocks the weather entries quote", () => {
    expect(getMove("Sunny Day")?.shortDesc).toContain("5 turns");
    expect(getItem("Heat Rock")?.shortDesc).toContain("8 turns instead of 5");
    expect(getItem("Damp Rock")?.shortDesc).toContain("8 turns instead of 5");
    expect(getItem("Smooth Rock")?.shortDesc).toContain("8 turns instead of 5");
    expect(getItem("Icy Rock")?.shortDesc).toContain("8 turns instead of 5");
  });

  it("has the four weather-setting abilities", () => {
    for (const ability of [
      "Drought",
      "Drizzle",
      "Sand Stream",
      "Snow Warning",
    ]) {
      expect(getAbility(ability)?.shortDesc, ability).toContain("On switch-in");
    }
  });
});

describe("terrain numbers cited in the field entries", () => {
  it("boosts grounded attackers 1.3× in their terrain", () => {
    const thunderbolt = dmg(garchomp(), snorlax(), "Thunderbolt");
    near(
      ratio(
        thunderbolt,
        dmg(garchomp(), snorlax(), "Thunderbolt", { terrain: "Electric" }),
      ),
      1.3,
    );
    const energyBall = dmg(garchomp(), snorlax(), "Energy Ball");
    near(
      ratio(
        energyBall,
        dmg(garchomp(), snorlax(), "Energy Ball", { terrain: "Grassy" }),
      ),
      1.3,
    );
    const psychic = dmg(garchomp(), snorlax(), "Psychic");
    near(
      ratio(
        psychic,
        dmg(garchomp(), snorlax(), "Psychic", { terrain: "Psychic" }),
      ),
      1.3,
    );
  });

  it("halves Dragon into grounded defenders only", () => {
    const grounded = dmg(garchomp(), snorlax(), "Dragon Claw");
    near(
      ratio(
        grounded,
        dmg(garchomp(), snorlax(), "Dragon Claw", { terrain: "Misty" }),
      ),
      0.5,
    );
    const flying = dmg(garchomp(), charizard(), "Dragon Claw");
    expect(
      ratio(
        flying,
        dmg(garchomp(), charizard(), "Dragon Claw", { terrain: "Misty" }),
      ),
    ).toBe(1);
  });

  it("states the durations, extender and surge setters the entries quote", () => {
    for (const terrain of [
      "Electric Terrain",
      "Grassy Terrain",
      "Psychic Terrain",
      "Misty Terrain",
    ]) {
      expect(getMove(terrain)?.shortDesc, terrain).toContain("5 turns");
    }
    expect(getItem("Terrain Extender")?.shortDesc).toContain(
      "8 turns instead of 5",
    );
    for (const surge of [
      "Electric Surge",
      "Grassy Surge",
      "Psychic Surge",
      // Misty Surge is deliberately absent from Champions; the Misty Terrain
      // entry says so, and the absence test below pins it.
    ]) {
      expect(getAbility(surge)?.shortDesc, surge).toContain("On switch-in");
    }
  });
});

describe("screen numbers cited in the field entries", () => {
  it("cuts damage 0.5× in singles and 0.66× in doubles", () => {
    const singlesBase = dmg(garchomp(), incineroar(), "Dragon Claw", {
      format: "singles",
    });
    const singlesScreen = dmg(
      garchomp(),
      incineroar(),
      "Dragon Claw",
      { format: "singles" },
      {},
      { reflect: true },
    );
    near(ratio(singlesBase, singlesScreen), 0.5);

    const doublesBase = dmg(garchomp(), incineroar(), "Dragon Claw");
    const doublesScreen = dmg(
      garchomp(),
      incineroar(),
      "Dragon Claw",
      {},
      {},
      { reflect: true },
    );
    near(ratio(doublesBase, doublesScreen), 2 / 3);

    const doublesVeil = dmg(
      garchomp(),
      incineroar(),
      "Dragon Claw",
      {},
      {},
      { auroraVeil: true },
    );
    near(ratio(doublesBase, doublesVeil), 2 / 3);
  });

  it("lasts five turns, eight with Light Clay, and Aurora Veil needs snow", () => {
    expect(getItem("Light Clay")?.shortDesc).toContain("8 turns instead of 5");
    expect(getMove("Aurora Veil")?.shortDesc).toContain("Snow only");
  });
});

describe("turn-order numbers cited in the concepts and field entries", () => {
  it("has the priorities the entries cite", () => {
    expect(getMove("Fake Out")?.priority).toBe(3);
    expect(getMove("Follow Me")?.priority).toBe(2);
    expect(getMove("Rage Powder")?.priority).toBe(2);
    expect(getMove("Helping Hand")?.priority).toBe(5);
    expect(getMove("Protect")?.priority).toBe(4);
    expect(getMove("Wide Guard")?.priority).toBe(3);
    expect(getMove("Quick Guard")?.priority).toBe(3);
    expect(getMove("Trick Room")?.priority).toBe(-7);
    expect(getMove("Aqua Jet")?.priority).toBe(1);
  });

  it("states the durations the Tailwind and Trick Room guides quote", () => {
    expect(getMove("Tailwind")?.shortDesc).toContain("4 turns");
    expect(getMove("Trick Room")?.shortDesc).toContain("5 turns");
    expect(getMove("Trick Room")?.shortDesc).toContain("reversed");
  });

  it("describes the speed-control moves the guide cites", () => {
    for (const move of ["Icy Wind", "Electroweb"]) {
      expect(getMove(move)?.isSpread, move).toBe(true);
      expect(getMove(move)?.shortDesc, move).toContain(
        "100% chance to lower the foe(s) Speed by 1",
      );
    }
    expect(getMove("Thunder Wave")?.accuracy).toBe(90);
  });
});

describe("damage numbers cited in the concepts entries", () => {
  it("gives STAB 1.5×", () => {
    const stab = dmg(charizard(), snorlax(), "Flamethrower");
    const noStab = dmg(charizard(), snorlax(), "Sludge Bomb");
    near(ratio(noStab, stab), 1.5);
  });

  it("makes critical hits 1.5× and ignores the defender's stage", () => {
    const plain = dmg(garchomp(), incineroar(), "Dragon Claw");
    const viaCalc = calculateDamage(
      battlerFromSet(garchomp()),
      battlerFromSet(incineroar()),
      "Dragon Claw",
      F,
      { crit: true },
    );
    near(ratio(plain, viaCalc), 1.5);
    const boostedDefender: BattlerState = {
      ...battlerFromSet(incineroar()),
      boosts: { atk: 0, def: 1, spa: 0, spd: 0, spe: 0 },
    };
    const critVsBoosted = calculateDamage(
      battlerFromSet(garchomp()),
      boostedDefender,
      "Dragon Claw",
      F,
      { crit: true },
    );
    expect(critVsBoosted.max).toBe(viaCalc.max);
  });

  it("applies stat stages at 1.5×, 2× and 2/3×", () => {
    const base = dmg(garchomp(), incineroar(), "Dragon Claw");
    const plus1 = dmg(
      garchomp(),
      incineroar(),
      "Dragon Claw",
      {},
      {
        boosts: { atk: 1, def: 0, spa: 0, spd: 0, spe: 0 },
      },
    );
    near(ratio(base, plus1), 1.5);
    const plus2 = dmg(
      garchomp(),
      incineroar(),
      "Dragon Claw",
      {},
      {
        boosts: { atk: 2, def: 0, spa: 0, spd: 0, spe: 0 },
      },
    );
    near(ratio(base, plus2), 2);
    const minus1 = dmg(
      garchomp(),
      incineroar(),
      "Dragon Claw",
      {},
      {
        boosts: { atk: -1, def: 0, spa: 0, spd: 0, spe: 0 },
      },
    );
    near(ratio(base, minus1), 2 / 3);
  });

  it("has the damage-changing abilities the entry names", () => {
    // Thick Fat halves Fire damage into the holder.
    const fireBase = dmg(charizard(), snorlax(), "Flamethrower");
    const fatSnorlax = set("Snorlax", { ability: "Thick Fat" });
    near(ratio(fireBase, dmg(charizard(), fatSnorlax, "Flamethrower")), 0.5);
    // Huge Power doubles the Attack used. Aqua Jet's small numbers floor
    // at three stages, so the ratio lands near 2 but not on it.
    const azumarill = set("Azumarill", { ability: "Huge Power" });
    const noHuge = set("Azumarill", { ability: "Sap Sipper" });
    near(
      ratio(
        dmg(noHuge, snorlax(), "Aqua Jet"),
        dmg(azumarill, snorlax(), "Aqua Jet"),
      ),
      2,
      0.15,
    );
    // Flash Fire makes the holder immune to Fire moves.
    const arcanine = set("Arcanine", { ability: "Flash Fire" });
    expect(dmg(charizard(), arcanine, "Flamethrower").max).toBe(0);
    // Levitate makes the holder immune to Ground moves.
    const rotom = set("Rotom", { ability: "Levitate" });
    expect(dmg(garchomp(), rotom, "Earthquake").max).toBe(0);
  });
});

describe("absences the entries state", () => {
  it("has no Mist move in Champions", () => {
    expect(getMove("Mist")).toBeUndefined();
  });

  it("has no Misty Surge ability in Champions", () => {
    expect(getAbility("Misty Surge")).toBeUndefined();
  });

  it("has no primal weather abilities in Champions", () => {
    expect(getAbility("Desolate Land")).toBeUndefined();
    expect(getAbility("Primordial Sea")).toBeUndefined();
    expect(getAbility("Delta Stream")).toBeUndefined();
  });
});
