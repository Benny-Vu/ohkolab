import { describe, expect, it } from "vitest";

import { createDefaultSet, validateSet } from "@/data";
import {
  exportSet,
  exportTeam,
  importSet,
  importTeam,
  toStatPoints,
} from "@/lib/team/showdown";
import type { PokemonSet } from "@/types/pokemon";
import { MAX_TEAM_SIZE } from "@/types/team";

const garchomp: PokemonSet = {
  species: "Garchomp",
  nickname: "Chomper",
  gender: "M",
  item: "Life Orb",
  ability: "Rough Skin",
  nature: "Jolly",
  statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
  moves: ["Earthquake", "Dragon Claw", "Rock Slide", "Protect"],
};

const sneasler: PokemonSet = {
  species: "Sneasler",
  item: "White Herb",
  ability: "Unburden",
  nature: "Adamant",
  statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
  moves: ["Close Combat", "Dire Claw", "Fake Out", "Protect"],
};

const rotom: PokemonSet = {
  species: "Rotom-Wash",
  item: null,
  ability: "Levitate",
  nature: "Modest",
  statPoints: { hp: 32, atk: 0, def: 1, spa: 32, spd: 1, spe: 0 },
  moves: ["Thunderbolt", "Will-O-Wisp", null, null],
};

/** The example from the vault note, as Showdown's teambuilder exports it. */
const SNEASLER_TEXT = `Sneasler @ White Herb
Ability: Unburden
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Close Combat
- Dire Claw
- Fake Out
- Protect`;

describe("exportSet", () => {
  it("writes a Champions set the way Showdown does", () => {
    expect(exportSet(sneasler)).toBe(SNEASLER_TEXT);
  });

  it("writes nickname, gender and item on the first line", () => {
    expect(exportSet(garchomp).split("\n")[0]).toBe(
      "Chomper (Garchomp) (M) @ Life Orb",
    );
    expect(
      exportSet({ ...garchomp, gender: "F", nickname: undefined }),
    ).toMatch(/^Garchomp \(F\) @ Life Orb\n/);
    expect(exportSet({ ...garchomp, gender: "N", item: null })).toMatch(
      /^Chomper \(Garchomp\)\n/,
    );
    expect(exportSet({ ...garchomp, nickname: "Garchomp" })).toMatch(
      /^Garchomp \(M\) @ Life Orb\n/,
    );
  });

  it("writes Stat Points on the EVs line and leaves out stats at 0", () => {
    expect(exportSet(garchomp)).toContain("\nEVs: 2 HP / 32 Atk / 32 Spe\n");
    expect(exportSet(rotom)).toContain(
      "\nEVs: 32 HP / 1 Def / 32 SpA / 1 SpD\n",
    );
  });

  it("leaves out what the set does not have", () => {
    expect(exportSet(createDefaultSet("Pikachu"))).toBe(
      "Pikachu\nAbility: Static\nLevel: 50\nHardy Nature",
    );
    expect(exportSet(rotom).split("\n").slice(-2)).toEqual([
      "- Thunderbolt",
      "- Will-O-Wisp",
    ]);
  });
});

describe("exportTeam", () => {
  it("separates the sets with a blank line", () => {
    expect(exportTeam([sneasler, garchomp])).toBe(
      `${exportSet(sneasler)}\n\n${exportSet(garchomp)}\n`,
    );
  });

  it("gives an empty string for an empty team", () => {
    expect(exportTeam([])).toBe("");
  });
});

describe("importSet", () => {
  it("reads a Showdown Champions export with Stat Points on the EVs line", () => {
    expect(importSet(SNEASLER_TEXT)).toEqual({ set: sneasler, warnings: [] });
  });

  it("reads nickname, species, gender and item from the first line", () => {
    const { set, warnings } = importSet(
      "Chomper (Garchomp) (M) @ Life Orb\nAbility: Rough Skin\nJolly Nature\n- Earthquake",
    );
    expect(warnings).toEqual([]);
    expect(set).toMatchObject({
      species: "Garchomp",
      nickname: "Chomper",
      gender: "M",
      item: "Life Orb",
      ability: "Rough Skin",
      nature: "Jolly",
      moves: ["Earthquake", null, null, null],
    });
  });

  it.each([
    ["Garchomp", { species: "Garchomp", item: null }],
    ["Garchomp (F)", { species: "Garchomp", gender: "F", item: null }],
    ["Garchomp @ Life Orb", { species: "Garchomp", item: "Life Orb" }],
    [
      "Big (Bad) Dragon (Garchomp) @ Life Orb",
      { species: "Garchomp", nickname: "Big (Bad) Dragon", item: "Life Orb" },
    ],
    [
      "a@b (Rotom-Wash) (F) @ Sitrus Berry",
      { species: "Rotom-Wash", nickname: "a@b", gender: "F" },
    ],
    ["garchomp @ life orb", { species: "Garchomp", item: "Life Orb" }],
  ])("reads the first line %j", (line, expected) => {
    const { set, warnings } = importSet(line);
    expect(warnings).toEqual([]);
    expect(set).toMatchObject(expected);
  });

  it("fills in defaults for what the text leaves out", () => {
    expect(importSet("Garchomp").set).toEqual(createDefaultSet("Garchomp"));
  });

  it("ignores Level, Shiny, Tera Type, IVs and lines it does not know", () => {
    const { set, warnings } = importSet(`Sneasler @ White Herb
Ability: Unburden
Level: 100
Shiny: Yes
Happiness: 0
Tera Type: Flying
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
IVs: 0 SpA
Some: nonsense
what is this line
- Close Combat
- Dire Claw
- Fake Out
- Protect`);
    expect(warnings).toEqual([]);
    expect(set).toEqual(sneasler);
  });

  it("copes with Windows line endings, tabs and stray spaces", () => {
    const text = `  ${SNEASLER_TEXT.split("\n").join("  \r\n\t")}\r\n`;
    expect(importSet(text)).toEqual({ set: sneasler, warnings: [] });
  });

  it("converts an EV spread from another game and says so", () => {
    const { set, warnings } = importSet(`Garchomp @ Life Orb
Ability: Rough Skin
Tera Type: Steel
EVs: 4 HP / 252 Atk / 252 Spe
Jolly Nature
- Earthquake`);
    expect(set?.statPoints).toEqual({
      hp: 1,
      atk: 32,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 32,
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/converted to Stat Points/);
  });

  it("keeps a spread with no value above 32 as Stat Points", () => {
    const { set, warnings } = importSet(
      "Garchomp\nEVs: 20 HP / 4 Atk / 10 Def / 32 Spe",
    );
    expect(set?.statPoints).toEqual({
      hp: 20,
      atk: 4,
      def: 10,
      spa: 0,
      spd: 0,
      spe: 32,
    });
    expect(warnings).toEqual([]);
  });

  it("cuts a Stat Point spread that is over the total and says so", () => {
    const { set, warnings } = importSet(
      "Garchomp\nEVs: 32 HP / 32 Atk / 32 Spe",
    );
    expect(set?.statPoints).toEqual({
      hp: 32,
      atk: 32,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 2,
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/over the limits/);
    expect(set ? validateSet(set) : null).toEqual([]);
  });

  it("reads lines other tools label as Stat Points without converting", () => {
    for (const label of ["SPs", "Stat Points", "Points"]) {
      const { set, warnings } = importSet(
        `Garchomp\n${label}: 2 HP / 32 Atk / 32 Spe`,
      );
      expect(set?.statPoints).toMatchObject({ hp: 2, atk: 32, spe: 32 });
      expect(warnings).toEqual([]);
    }
  });

  it("reads other spellings of the stat names and ignores broken parts", () => {
    const { set } = importSet(
      "Garchomp\nEVs: 2 hp / 3 Attack / 4 SpDef / 5 Speed / lots Def / 6 Luck / 7",
    );
    expect(set?.statPoints).toEqual({
      hp: 2,
      atk: 3,
      def: 0,
      spa: 0,
      spd: 4,
      spe: 5,
    });
  });

  it("takes a Mega forme as its base species holding the stone", () => {
    const { set, warnings } = importSet(
      "Garchomp-Mega\nAbility: Sand Force\n- Earthquake",
    );
    expect(set).toMatchObject({
      species: "Garchomp",
      item: "Garchompite",
      ability: "Sand Veil",
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/Garchomp-Mega only exists in battle/);
    expect(set ? validateSet(set) : null).toEqual([]);
  });

  it("finds the roster forme for a bare species name", () => {
    expect(importSet("Aegislash").set?.species).toBe("Aegislash-Shield");
    expect(importSet("Aegislash-Blade @ Leftovers").set).toMatchObject({
      species: "Aegislash-Shield",
      item: "Leftovers",
    });
  });

  it("falls back to the species when the forme is not in the game", () => {
    const { set, warnings } = importSet("Pikachu-Belle @ Life Orb");
    expect(set).toMatchObject({ species: "Pikachu", item: "Life Orb" });
    expect(warnings).toEqual([
      '"Pikachu-Belle" is not in Pokémon Champions; Pikachu was imported instead.',
    ]);
  });

  it("warns about an unknown species and imports nothing for it", () => {
    const { set, warnings } = importSet("Missingno @ Life Orb\n- Earthquake");
    expect(set).toBeNull();
    expect(warnings).toEqual([
      '"Missingno" is not in Pokémon Champions; that Pokémon was skipped.',
    ]);
  });

  it("warns about unknown items, abilities, natures and moves and keeps the rest", () => {
    const { set, warnings } = importSet(`Chomper (Garchomp) @ Master Ball
Ability: Wonder Guard Deluxe
Sleepy Nature
- Earthquake
- Hyper Mega Punch
- Protect`);
    expect(set).toEqual({
      species: "Garchomp",
      nickname: "Chomper",
      item: null,
      ability: "Sand Veil",
      nature: "Hardy",
      statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: ["Earthquake", "Protect", null, null],
    });
    expect(warnings).toHaveLength(4);
    expect(warnings.join("\n")).toMatch(/item "Master Ball"/);
    expect(warnings.join("\n")).toMatch(/ability "Wonder Guard Deluxe"/);
    expect(warnings.join("\n")).toMatch(/"Sleepy" is not a nature/);
    expect(warnings.join("\n")).toMatch(/move "Hyper Mega Punch"/);
    for (const warning of warnings) {
      expect(warning).toMatch(/^Chomper \(Garchomp\): /);
    }
  });

  it("keeps the first four moves and the first option of a slashed move", () => {
    const { set, warnings } = importSet(`Garchomp
- Earthquake / Rock Slide
- Dragon Claw
~ Protect
- Swords Dance
- Rock Slide`);
    expect(set?.moves).toEqual([
      "Earthquake",
      "Dragon Claw",
      "Protect",
      "Swords Dance",
    ]);
    expect(warnings).toEqual([
      "Garchomp: only the first four moves were kept.",
    ]);
  });

  it("gives nothing for text without a Pokémon", () => {
    expect(importSet("")).toEqual({ set: null, warnings: [] });
    expect(importSet(" \n\r\n\t ")).toEqual({ set: null, warnings: [] });
  });

  it("reads only the first Pokémon of several", () => {
    expect(importSet(exportTeam([sneasler, garchomp])).set).toEqual(sneasler);
  });
});

describe("importTeam", () => {
  it("round-trips a team through export and import", () => {
    const members = [
      garchomp,
      sneasler,
      rotom,
      createDefaultSet("Pikachu"),
      { ...createDefaultSet("Charizard"), item: "Charizardite Y" },
      { ...createDefaultSet("Aegislash-Shield"), gender: "F" as const },
    ];
    const text = exportTeam(members);
    const imported = importTeam(text);
    expect(imported).toEqual({
      name: null,
      gameTeamId: null,
      sets: members,
      warnings: [],
    });
    expect(exportTeam(imported.sets)).toBe(text);
  });

  it("round-trips the Champions team ID through a comment line", () => {
    const text = exportTeam([garchomp], "AbCd123456");
    expect(text.startsWith("// Champions team ID: AbCd123456\n")).toBe(true);
    const imported = importTeam(text);
    expect(imported.gameTeamId).toBe("AbCd123456");
    expect(imported.sets).toEqual([garchomp]);
    // And the re-export keeps it.
    expect(exportTeam(imported.sets, imported.gameTeamId)).toBe(text);
  });

  it("ignores a malformed ID comment instead of storing it", () => {
    const imported = importTeam(
      "// Champions team ID: short\n\n" + exportSet(garchomp),
    );
    expect(imported.gameTeamId).toBeNull();
    expect(imported.sets).toEqual([garchomp]);
  });

  it("round-trips every legal Stat Point spread shape", () => {
    const spreads = [
      { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      { hp: 32, atk: 32, def: 2, spa: 0, spd: 0, spe: 0 },
      { hp: 11, atk: 11, def: 11, spa: 11, spd: 11, spe: 11 },
      { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 1 },
    ];
    for (const statPoints of spreads) {
      const set = { ...createDefaultSet("Garchomp"), statPoints };
      expect(importSet(exportSet(set))).toEqual({ set, warnings: [] });
    }
  });

  it("reads the team name from a Showdown backup header", () => {
    const text = `=== [gen9championsvgc2026regmc] Rain room ===\n\n${exportTeam([garchomp, sneasler])}`;
    expect(importTeam(text)).toEqual({
      name: "Rain room",
      gameTeamId: null,
      sets: [garchomp, sneasler],
      warnings: [],
    });
    expect(importTeam("=== Untagged ===\n\nGarchomp").name).toBe("Untagged");
  });

  it("tolerates extra blank lines between and around the sets", () => {
    const text = `\n\n${exportSet(garchomp)}\n\n\n\n${exportSet(sneasler)}\n\n\n`;
    expect(importTeam(text).sets).toEqual([garchomp, sneasler]);
  });

  it("skips an unknown Pokémon and imports the others", () => {
    const text = `${exportSet(garchomp)}\n\nMissingno\n- Earthquake\n\n${exportSet(sneasler)}`;
    const { sets, warnings } = importTeam(text);
    expect(sets).toEqual([garchomp, sneasler]);
    expect(warnings).toEqual([
      '"Missingno" is not in Pokémon Champions; that Pokémon was skipped.',
    ]);
  });

  it("keeps a full team and says how many were left out", () => {
    const eight = Array.from({ length: 8 }, () => createDefaultSet("Pikachu"));
    const { sets, warnings } = importTeam(exportTeam(eight));
    expect(sets).toHaveLength(MAX_TEAM_SIZE);
    expect(warnings).toEqual(["A team holds 6 Pokémon; 2 more were left out."]);
  });

  it("mentions an EV conversion once for the whole team", () => {
    const text = `Garchomp\nEVs: 252 Atk / 4 SpD / 252 Spe\n\nSneasler\nEVs: 252 Atk / 4 Def / 252 Spe\n\nPikachu\nEVs: 32 Spe`;
    const { sets, warnings } = importTeam(text);
    expect(sets.map((set) => set.statPoints.spe)).toEqual([32, 32, 32]);
    expect(sets[0]?.statPoints).toMatchObject({ atk: 32, spd: 1 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/converted to Stat Points/);
  });

  it("gives an empty team for empty or meaningless text", () => {
    expect(importTeam("")).toEqual({
      name: null,
      gameTeamId: null,
      sets: [],
      warnings: [],
    });
    expect(importTeam("\n\n  \n")).toEqual({
      name: null,
      gameTeamId: null,
      sets: [],
      warnings: [],
    });
    const junk = importTeam("hello there\nthis is not a team");
    expect(junk.sets).toEqual([]);
    expect(junk.warnings).toHaveLength(1);
  });
});

describe("toStatPoints", () => {
  it("converts EVs with floor((EV + 4) / 8)", () => {
    const { statPoints, convertedFromEvs, reduced } = toStatPoints(
      { hp: 3, atk: 4, spa: 12, spd: 244, spe: 252 },
      "evs",
    );
    expect(statPoints).toEqual({
      hp: 0,
      atk: 1,
      def: 0,
      spa: 2,
      spd: 31,
      spe: 32,
    });
    expect(convertedFromEvs).toBe(true);
    expect(reduced).toBe(false);
    expect(toStatPoints({ hp: 11, atk: 60 }, "evs").statPoints).toMatchObject({
      hp: 1,
      atk: 8,
    });
  });

  it("treats the line as EVs as soon as one value is above 32", () => {
    expect(toStatPoints({ hp: 32, atk: 33 }, "evs")).toMatchObject({
      statPoints: { hp: 4, atk: 4 },
      convertedFromEvs: true,
    });
    expect(toStatPoints({ hp: 32, atk: 32 }, "evs")).toMatchObject({
      statPoints: { hp: 32, atk: 32 },
      convertedFromEvs: false,
      reduced: false,
    });
  });

  it("never passes the limits, whatever comes in", () => {
    const wild = toStatPoints(
      { hp: 999, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
      "evs",
    );
    expect(wild.reduced).toBe(true);
    expect(Math.max(...Object.values(wild.statPoints))).toBeLessThanOrEqual(32);
    expect(
      Object.values(wild.statPoints).reduce((sum, value) => sum + value, 0),
    ).toBe(66);

    const labelled = toStatPoints({ hp: 40, atk: -5, def: 2.9 }, "sp");
    expect(labelled).toEqual({
      statPoints: { hp: 32, atk: 0, def: 2, spa: 0, spd: 0, spe: 0 },
      convertedFromEvs: false,
      reduced: true,
    });
  });

  it("takes points from the smallest investments first", () => {
    expect(
      toStatPoints({ hp: 32, atk: 32, def: 4, spe: 6 }, "sp").statPoints,
    ).toEqual({ hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 2 });
  });
});
