import { describe, expect, it } from "vitest";

import {
  calcStats,
  calculateDamage,
  createDefaultSet,
  defensiveMatchups,
  getItem,
  getLearnableMoves,
  getMove,
  getNature,
  getSpecies,
  listAbilities,
  listItems,
  listItemsFor,
  listMoves,
  listNatures,
  listSpecies,
  resolveBattleForme,
  typeEffectiveness,
  validateSet,
} from "@/data";
import { battlerFromSet, emptyField } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

function garchomp(): PokemonSet {
  return {
    ...createDefaultSet("Garchomp"),
    nature: "Jolly",
    item: "Life Orb",
    ability: "Rough Skin",
    statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
    moves: ["Earthquake", "Dragon Claw", "Protect", null],
  };
}

describe("roster", () => {
  it("lists team-legal species without in-battle formes", () => {
    const species = listSpecies();
    expect(species.length).toBeGreaterThan(200);
    expect(species.some((info) => info.isBattleOnly)).toBe(false);
    expect(species.map((info) => info.name)).toContain("Garchomp");
  });

  it("includes Megas only when asked", () => {
    const all = listSpecies({ includeBattleOnly: true });
    expect(all.length).toBeGreaterThan(listSpecies().length);
    expect(all.map((info) => info.name)).toContain("Garchomp-Mega");
    expect(all.map((info) => info.name)).not.toContain("Aegislash-Both");
  });

  it("describes a species with its abilities and Megas", () => {
    const info = getSpecies("garchomp");
    expect(info).toMatchObject({
      name: "Garchomp",
      types: ["Dragon", "Ground"],
      baseSpecies: "Garchomp",
      isMega: false,
      isBattleOnly: false,
    });
    expect(info?.baseStats.atk).toBe(130);
    expect(info?.abilities).toEqual(["Sand Veil", "Rough Skin"]);
    expect(info?.megas).toContainEqual({
      stone: "Garchompite",
      forme: "Garchomp-Mega",
    });
  });

  it("links a Mega back to its stone and base species", () => {
    expect(getSpecies("Garchomp-Mega")).toMatchObject({
      isMega: true,
      isBattleOnly: true,
      megaStone: "Garchompite",
      baseSpecies: "Garchomp",
    });
    expect(resolveBattleForme("Garchomp", "Garchompite")).toBe("Garchomp-Mega");
    expect(resolveBattleForme("Garchomp", "Life Orb")).toBe("Garchomp");
    expect(resolveBattleForme("Garchomp", null)).toBe("Garchomp");
  });
});

describe("moves, items, abilities, natures", () => {
  it("describes a move", () => {
    expect(getMove("earthquake")).toMatchObject({
      name: "Earthquake",
      type: "Ground",
      category: "Physical",
      basePower: 100,
      accuracy: 100,
      isSpread: true,
    });
    expect(listMoves().map((move) => move.name)).not.toContain("(No Move)");
  });

  it("finds the moves a species can learn, including pre-evolution moves", async () => {
    const moves = await getLearnableMoves("Garchomp");
    expect(moves).toContain("Earthquake");
    expect(moves).toContain("Protect");
    const everyMove = new Set(listMoves().map((move) => move.name));
    expect(moves.every((move) => everyMove.has(move))).toBe(true);
    expect(await getLearnableMoves("Garchomp-Mega")).toEqual(moves);
  });

  it("limits Mega Stones to the species that can use them", () => {
    expect(getItem("Garchompite")?.megaStoneFor).toEqual(["Garchomp"]);
    expect(getItem("Life Orb")?.megaStoneFor).toBeNull();
    const forGarchomp = listItemsFor("Garchomp").map((item) => item.name);
    expect(forGarchomp).toContain("Garchompite");
    expect(forGarchomp).toContain("Life Orb");
    expect(forGarchomp).not.toContain("Abomasite");
    expect(listItems().length).toBeGreaterThan(forGarchomp.length);
  });

  it("lists abilities and natures", () => {
    expect(listAbilities().length).toBeGreaterThan(100);
    expect(listNatures()).toHaveLength(25);
    expect(getNature("jolly")).toEqual({
      name: "Jolly",
      plus: "spe",
      minus: "spa",
    });
    expect(getNature("Hardy")).toEqual({
      name: "Hardy",
      plus: null,
      minus: null,
    });
  });
});

describe("type chart", () => {
  it("multiplies effectiveness across both types", () => {
    expect(typeEffectiveness("Ice", ["Dragon", "Ground"])).toBe(4);
    expect(typeEffectiveness("Electric", ["Dragon", "Ground"])).toBe(0);
    expect(typeEffectiveness("Fire", ["Dragon", "Ground"])).toBe(0.5);
    expect(defensiveMatchups(["Dragon", "Ground"]).Fairy).toBe(2);
  });
});

describe("stats and sets", () => {
  it("computes Champions stats from Stat Points and nature", () => {
    expect(calcStats(garchomp())).toEqual({
      hp: 185,
      atk: 182,
      def: 115,
      spa: 90,
      spd: 105,
      spe: 169,
    });
  });

  it("creates a blank, valid set", () => {
    const set = createDefaultSet("garchomp");
    expect(set).toMatchObject({
      species: "Garchomp",
      ability: "Sand Veil",
      item: null,
    });
    expect(validateSet(set)).toEqual([]);
    expect(validateSet(garchomp())).toEqual([]);
  });

  it("reports what is wrong with a set", () => {
    const set = garchomp();
    set.statPoints = { hp: 32, atk: 32, def: 32, spa: 0, spd: 0, spe: 40 };
    set.ability = "Levitate";
    set.item = "Abomasite";
    set.moves = ["Earthquake", "Earthquake", null, null];
    const problems = validateSet(set);
    expect(problems).toContain("Garchomp cannot have the ability Levitate.");
    expect(problems).toContain("Garchomp cannot use Abomasite.");
    expect(problems).toContain("Spe Stat Points must be between 0 and 32.");
    expect(problems).toContain("136 Stat Points spent; the limit is 66.");
    expect(problems).toContain("The same move is chosen twice.");
    expect(validateSet({ ...set, species: "Missingno" })).toEqual([
      "Missingno is not in Pokémon Champions.",
    ]);
  });
});

describe("damage", () => {
  const incineroar: PokemonSet = {
    ...createDefaultSet("Incineroar"),
    nature: "Careful",
    statPoints: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 },
  };

  it("calculates a damage range with a description", () => {
    const result = calculateDamage(
      battlerFromSet(garchomp()),
      battlerFromSet(incineroar),
      "Earthquake",
      emptyField("singles"),
    );
    expect(result.move).toBe("Earthquake");
    expect(result.min).toBeGreaterThan(0);
    expect(result.max).toBeGreaterThanOrEqual(result.min);
    expect(result.defenderMaxHp).toBe(202);
    expect(result.rolls).toHaveLength(16);
    expect(result.rolls?.[0]).toBe(result.min);
    expect(result.rolls?.at(-1)).toBe(result.max);
    expect(result.maxPercent).toBeCloseTo((result.max / 202) * 100, 1);
    expect(result.description).toContain("Garchomp Earthquake vs.");
    expect(result.koText).not.toBe("");
  });

  it("reduces spread moves in doubles and respects screens", () => {
    const attacker = battlerFromSet(garchomp());
    const defender = battlerFromSet(incineroar);
    const singles = calculateDamage(
      attacker,
      defender,
      "Earthquake",
      emptyField("singles"),
    );
    const doubles = calculateDamage(
      attacker,
      defender,
      "Earthquake",
      emptyField("doubles"),
    );
    expect(doubles.max).toBeLessThan(singles.max);

    const screened = emptyField("singles");
    screened.defenderSide.reflect = true;
    const reflect = calculateDamage(attacker, defender, "Earthquake", screened);
    expect(reflect.max).toBeLessThan(singles.max);
  });

  it("returns zero damage for immunities and status moves", () => {
    const attacker = battlerFromSet(garchomp());
    const flying = battlerFromSet(createDefaultSet("Charizard"));
    const immune = calculateDamage(
      attacker,
      flying,
      "Earthquake",
      emptyField(),
    );
    expect(immune).toMatchObject({
      min: 0,
      max: 0,
      minPercent: 0,
      maxPercent: 0,
      koText: "",
    });
    const status = calculateDamage(attacker, flying, "Protect", emptyField());
    expect(status.max).toBe(0);
  });

  it("applies boosts and current HP", () => {
    const base = battlerFromSet(garchomp());
    const boosted = { ...base, boosts: { ...base.boosts, atk: 2 } };
    const defender = battlerFromSet(incineroar);
    const field = emptyField("singles");
    expect(
      calculateDamage(boosted, defender, "Dragon Claw", field).max,
    ).toBeGreaterThan(
      calculateDamage(base, defender, "Dragon Claw", field).max,
    );
    const hurt = { ...defender, hpPercent: 10 };
    expect(calculateDamage(base, hurt, "Dragon Claw", field).koText).toContain(
      "OHKO",
    );
  });
});
