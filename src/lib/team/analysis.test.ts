import { describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import {
  attackingTypes,
  battleTypes,
  defensiveOverview,
  memberLabel,
  offensiveCoverage,
  teamWarnings,
} from "@/lib/team/analysis";
import { TYPE_NAMES, type PokemonSet, type TypeName } from "@/types/pokemon";

function set(species: string, patch: Partial<PokemonSet> = {}): PokemonSet {
  return { ...createDefaultSet(species), ...patch };
}

function withMoves(species: string, ...moves: string[]): PokemonSet {
  return set(species, {
    moves: [
      moves[0] ?? null,
      moves[1] ?? null,
      moves[2] ?? null,
      moves[3] ?? null,
    ],
  });
}

function byType<T extends { type: TypeName }>(entries: T[], type: TypeName): T {
  const entry = entries.find((candidate) => candidate.type === type);
  if (!entry) throw new Error(`No entry for ${type}`);
  return entry;
}

describe("memberLabel", () => {
  it("prefers the nickname and falls back to the species", () => {
    expect(memberLabel(set("Garchomp", { nickname: "Chomper" }))).toBe(
      "Chomper",
    );
    expect(memberLabel(set("Garchomp", { nickname: "  " }))).toBe("Garchomp");
    expect(memberLabel(set("Garchomp"))).toBe("Garchomp");
  });
});

describe("battleTypes", () => {
  it("gives the species' types", () => {
    expect(battleTypes(set("Garchomp"))).toEqual(["Dragon", "Ground"]);
  });

  it("uses the Mega forme's types when the Mega Stone is held", () => {
    expect(battleTypes(set("Charizard"))).toEqual(["Fire", "Flying"]);
    expect(battleTypes(set("Charizard", { item: "Charizardite X" }))).toEqual([
      "Fire",
      "Dragon",
    ]);
    expect(battleTypes(set("Charizard", { item: "Garchompite" }))).toEqual([
      "Fire",
      "Flying",
    ]);
  });

  it("gives null for an unknown species", () => {
    expect(battleTypes(set("Missingno"))).toBeNull();
  });
});

describe("defensiveOverview", () => {
  it("lists all 18 attacking types in type-chart order", () => {
    const overview = defensiveOverview([]);
    expect(overview.map((entry) => entry.type)).toEqual([...TYPE_NAMES]);
    for (const entry of overview) {
      expect(entry).toMatchObject({
        weak: 0,
        resistant: 0,
        immune: 0,
        neutral: 0,
        multipliers: [],
      });
    }
  });

  it("counts weak, resistant, immune and neutral members per type", () => {
    // Garchomp: Dragon/Ground. Gengar: Ghost/Poison. Incineroar: Fire/Dark.
    const overview = defensiveOverview([
      set("Garchomp"),
      set("Gengar"),
      set("Incineroar"),
    ]);

    expect(byType(overview, "Ice")).toEqual({
      type: "Ice",
      weak: 1,
      resistant: 1,
      immune: 0,
      neutral: 1,
      multipliers: [4, 1, 0.5],
    });
    expect(byType(overview, "Ground")).toMatchObject({
      weak: 2,
      resistant: 0,
      immune: 0,
      neutral: 1,
      multipliers: [1, 2, 2],
    });
    expect(byType(overview, "Electric")).toMatchObject({
      weak: 0,
      immune: 1,
      neutral: 2,
      multipliers: [0, 1, 1],
    });
    expect(byType(overview, "Normal")).toMatchObject({
      immune: 1,
      neutral: 2,
      multipliers: [1, 0, 1],
    });
    expect(byType(overview, "Psychic")).toMatchObject({
      weak: 1,
      immune: 1,
      neutral: 1,
      multipliers: [1, 2, 0],
    });
  });

  it("counts every member exactly once per type", () => {
    const members = [set("Garchomp"), set("Gengar"), set("Rotom-Wash")];
    for (const entry of defensiveOverview(members)) {
      expect(entry.weak + entry.resistant + entry.immune + entry.neutral).toBe(
        members.length,
      );
      expect(entry.multipliers).toHaveLength(members.length);
    }
  });

  it("leaves an unknown species out of the counts", () => {
    const fire = byType(
      defensiveOverview([set("Missingno"), set("Rillaboom")]),
      "Fire",
    );
    expect(fire).toMatchObject({
      weak: 1,
      resistant: 0,
      immune: 0,
      neutral: 0,
      multipliers: [null, 2],
    });
  });

  it("follows the Mega typing of a member holding its stone", () => {
    const base = byType(defensiveOverview([set("Charizard")]), "Rock");
    const mega = byType(
      defensiveOverview([set("Charizard", { item: "Charizardite X" })]),
      "Rock",
    );
    expect(base.multipliers).toEqual([4]);
    expect(mega.multipliers).toEqual([2]);
  });
});

describe("attackingTypes", () => {
  it("collects the types of damaging moves only, without repeats", () => {
    expect(
      attackingTypes([
        withMoves("Garchomp", "Earthquake", "Protect", "Swords Dance"),
        withMoves("Incineroar", "Flare Blitz", "Earthquake", "Parting Shot"),
        withMoves("Sneasler", "Not A Move", "Fake Out"),
      ]),
    ).toEqual(["Normal", "Fire", "Ground"]);
  });

  it("counts damaging moves without a fixed power", () => {
    expect(attackingTypes([withMoves("Sneasler", "Seismic Toss")])).toEqual([
      "Fighting",
    ]);
  });
});

describe("offensiveCoverage", () => {
  it("has no best multiplier when the team has no damaging moves", () => {
    const coverage = offensiveCoverage([
      set("Garchomp"),
      withMoves("Incineroar", "Protect", "Parting Shot"),
    ]);
    expect(coverage.map((entry) => entry.type)).toEqual([...TYPE_NAMES]);
    for (const entry of coverage) {
      expect(entry).toMatchObject({ best: null, moveTypes: [] });
    }
  });

  it("gives the best effectiveness and the move types that reach it", () => {
    const coverage = offensiveCoverage([
      withMoves("Garchomp", "Earthquake", "Dragon Claw", "Protect"),
      withMoves("Rotom-Wash", "Thunderbolt", "Surf"),
    ]);
    expect(byType(coverage, "Fire")).toEqual({
      type: "Fire",
      best: 2,
      moveTypes: ["Water", "Ground"],
    });
    expect(byType(coverage, "Dragon")).toEqual({
      type: "Dragon",
      best: 2,
      moveTypes: ["Dragon"],
    });
    expect(byType(coverage, "Flying")).toEqual({
      type: "Flying",
      best: 2,
      moveTypes: ["Electric"],
    });
    expect(byType(coverage, "Grass")).toEqual({
      type: "Grass",
      best: 1,
      moveTypes: ["Dragon"],
    });
    expect(byType(coverage, "Fairy")).toEqual({
      type: "Fairy",
      best: 1,
      moveTypes: ["Water", "Electric", "Ground"],
    });
  });

  it("reports a type every move is resisted by", () => {
    const coverage = offensiveCoverage([
      withMoves("Rotom-Wash", "Thunderbolt", "Surf"),
    ]);
    expect(byType(coverage, "Grass")).toEqual({
      type: "Grass",
      best: 0.5,
      moveTypes: ["Water", "Electric"],
    });
    expect(byType(coverage, "Ground")).toEqual({
      type: "Ground",
      best: 2,
      moveTypes: ["Water"],
    });
  });

  it("reports a type the team cannot touch", () => {
    const coverage = offensiveCoverage([
      withMoves("Sneasler", "Fake Out", "Close Combat"),
    ]);
    expect(byType(coverage, "Ghost")).toEqual({
      type: "Ghost",
      best: 0,
      moveTypes: ["Normal", "Fighting"],
    });
    expect(byType(coverage, "Steel")).toMatchObject({
      best: 2,
      moveTypes: ["Fighting"],
    });
  });
});

describe("teamWarnings", () => {
  it("finds nothing wrong with an empty team or a clean one", () => {
    expect(teamWarnings([])).toEqual([]);
    expect(
      teamWarnings([
        set("Garchomp", { item: "Life Orb" }),
        set("Incineroar", { item: "Sitrus Berry" }),
        set("Pikachu"),
        set("Gengar"),
      ]),
    ).toEqual([]);
  });

  it("flags duplicate species, counting formes as the same species", () => {
    expect(
      teamWarnings([
        set("Garchomp"),
        set("Rotom-Wash"),
        set("Garchomp"),
        set("Rotom-Heat"),
        set("Garchomp"),
      ]),
    ).toEqual([
      {
        kind: "duplicate-species",
        message: "Garchomp is on the team 3 times.",
        members: [0, 2, 4],
      },
      {
        kind: "duplicate-species",
        message: "Rotom is on the team 2 times.",
        members: [1, 3],
      },
    ]);
  });

  it("flags duplicate held items but not empty hands", () => {
    expect(
      teamWarnings([
        set("Garchomp", { item: "Life Orb" }),
        set("Incineroar"),
        set("Pikachu", { item: "Life Orb" }),
        set("Gengar"),
      ]),
    ).toEqual([
      {
        kind: "duplicate-item",
        message: "Life Orb is held by 2 Pokémon.",
        members: [0, 2],
      },
    ]);
  });

  it("adds each member's own problems, labelled with its name", () => {
    const warnings = teamWarnings([
      set("Garchomp"),
      set("Incineroar", {
        nickname: "Kitty",
        ability: "Levitate",
        statPoints: { hp: 32, atk: 32, def: 32, spa: 0, spd: 0, spe: 0 },
      }),
      set("Missingno"),
    ]);
    expect(warnings).toEqual([
      {
        kind: "set",
        message: "Kitty: Incineroar cannot have the ability Levitate.",
        members: [1],
      },
      {
        kind: "set",
        message: "Kitty: 96 Stat Points spent; the limit is 66.",
        members: [1],
      },
      {
        kind: "set",
        message: "Missingno: Missingno is not in Pokémon Champions.",
        members: [2],
      },
    ]);
  });
});
