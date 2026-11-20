import { describe, expect, it } from "vitest";

import { MAX_SP_TOTAL, totalStatPoints, validateSet } from "@/data";
import type { CommonSet } from "@/lib/metagame/common-sets";
import { commonSetToPokemonSet } from "@/lib/calc/common-set";
import type { PokemonSet, StatsTable } from "@/types/pokemon";

function commonSet(patch: Partial<CommonSet> = {}): CommonSet {
  return {
    index: 1,
    item: "Choice Scarf",
    ability: "Rough Skin",
    nature: "Jolly",
    statPoints: { hp: 4, atk: 32, def: 0, spa: 0, spd: 0, spe: 30 },
    moves: ["Earthquake", "Rock Slide", "Protect", "Dragon Claw"],
    speciesUsage: 0.234,
    assumed: false,
    ...patch,
  };
}

/** The set must exist and be legal; returns it for further assertions. */
function filled(species: string, common: CommonSet): PokemonSet {
  const set = commonSetToPokemonSet(species, common);
  expect(set).not.toBeNull();
  expect(validateSet(set as PokemonSet)).toEqual([]);
  return set as PokemonSet;
}

const emptyPoints = {} as StatsTable;

describe("commonSetToPokemonSet", () => {
  it("fills a legal set from a common set", () => {
    const set = filled("Garchomp", commonSet());
    expect(set).toEqual({
      species: "Garchomp",
      item: "Choice Scarf",
      ability: "Rough Skin",
      nature: "Jolly",
      statPoints: { hp: 4, atk: 32, def: 0, spa: 0, spd: 0, spe: 30 },
      moves: ["Earthquake", "Rock Slide", "Protect", "Dragon Claw"],
    });
  });

  it("drops names the Champions data does not know", () => {
    const set = filled(
      "Garchomp",
      commonSet({
        item: "Not An Item",
        ability: "Not An Ability",
        nature: "Sleepy",
        moves: ["Not A Move", "Earthquake", "Earthquake", null],
      }),
    );
    expect(set).toEqual({
      species: "Garchomp",
      item: null,
      // An unknown ability falls back to the species' first ability.
      ability: "Sand Veil",
      nature: "Hardy",
      statPoints: { hp: 4, atk: 32, def: 0, spa: 0, spd: 0, spe: 30 },
      moves: ["Earthquake", null, null, null],
    });
  });

  it("turns a battle-only Mega forme into its base species holding the stone", () => {
    const set = filled("Charizard-Mega-Y", commonSet());
    expect(set.species).toBe("Charizard");
    expect(set.item).toBe("Charizardite Y");
  });

  it("rejects a battle-only forme it cannot represent", () => {
    expect(commonSetToPokemonSet("Aegislash-Blade", commonSet())).toBeNull();
  });

  it("rejects an unknown species", () => {
    expect(commonSetToPokemonSet("Missingno", commonSet())).toBeNull();
  });

  it("rejects another species' Mega Stone as the item", () => {
    const set = filled("Garchomp", commonSet({ item: "Charizardite Y" }));
    expect(set.item).toBeNull();
  });

  it("trims excess Stat Points down to the legal total", () => {
    const set = filled(
      "Garchomp",
      commonSet({
        statPoints: { hp: 32, atk: 32, def: 32, spa: 32, spd: 32, spe: 32 },
      }),
    );
    expect(totalStatPoints(set.statPoints ?? emptyPoints)).toBe(MAX_SP_TOTAL);
  });
});
