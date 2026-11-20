import { describe, expect, it } from "vitest";

import { topCommonSets } from "@/lib/metagame/common-sets";
import type { PokemonUsage } from "@/lib/metagame/types";

function usageEntry(overrides: Partial<PokemonUsage> = {}): PokemonUsage {
  return {
    species: "Garchomp",
    rank: 1,
    usage: 0.34,
    abilities: [{ name: "Rough Skin", share: 0.9 }],
    items: [
      { name: "Choice Scarf", share: 0.4 },
      { name: "Life Orb", share: 0.2 },
    ],
    moves: [
      { name: "Earthquake", share: 0.99 },
      { name: "Protect", share: 0.8 },
      { name: "Rock Slide", share: 0.3 },
      { name: "Fire Fang", share: 0.1 },
    ],
    natures: [{ name: "Jolly", share: 0.8 }],
    spreads: [
      {
        nature: "Jolly",
        statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
        share: 0.5,
      },
      {
        nature: "Adamant",
        statPoints: { hp: 4, atk: 32, def: 0, spa: 0, spd: 0, spe: 28 },
        share: 0.2,
      },
    ],
    teammates: [],
    ...overrides,
  };
}

describe("topCommonSets", () => {
  it("returns nothing for a species missing from the snapshot", () => {
    expect(topCommonSets(null)).toEqual([]);
  });

  it("builds set 1 from the top spread, item, ability and moves", () => {
    const [first] = topCommonSets(usageEntry());
    expect(first).toMatchObject({
      index: 1,
      item: "Choice Scarf",
      ability: "Rough Skin",
      nature: "Jolly",
      statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      moves: ["Earthquake", "Protect", "Rock Slide", "Fire Fang"],
      speciesUsage: 0.34,
      assumed: false,
    });
  });

  it("varies the spread, item and ability for sets 2 and 3", () => {
    const entry = usageEntry({
      abilities: [
        { name: "Rough Skin", share: 0.6 },
        { name: "Sand Veil", share: 0.4 },
      ],
      spreads: [
        {
          nature: "Jolly",
          statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
          share: 0.5,
        },
        {
          nature: "Adamant",
          statPoints: { hp: 4, atk: 32, def: 0, spa: 0, spd: 0, spe: 28 },
          share: 0.2,
        },
        {
          nature: "Careful",
          statPoints: { hp: 32, atk: 4, def: 0, spa: 0, spd: 0, spe: 30 },
          share: 0.1,
        },
      ],
    });
    const sets = topCommonSets(entry, 3);
    expect(sets).toHaveLength(3);
    expect(sets[1]).toMatchObject({
      index: 2,
      item: "Life Orb",
      ability: "Sand Veil",
      nature: "Adamant",
    });
    // The third spread exists, but there is no third item or ability:
    // fall back to the most common of each.
    expect(sets[2]).toMatchObject({
      index: 3,
      item: "Choice Scarf",
      ability: "Rough Skin",
      nature: "Careful",
    });
  });

  it("stops at the spreads the data actually has", () => {
    expect(topCommonSets(usageEntry(), 3)).toHaveLength(2);
  });

  it("fills one assumed set when there is no spread data", () => {
    const [only] = topCommonSets(
      usageEntry({
        spreads: [],
        items: [{ name: "Other", share: 1 }],
      }),
    );
    expect(only).toMatchObject({
      index: 1,
      item: null,
      nature: null,
      statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      assumed: true,
    });
  });

  it("strips placeholder names the chaos files use", () => {
    const [first] = topCommonSets(
      usageEntry({
        items: [{ name: "Other", share: 1 }],
        moves: [
          { name: "Earthquake", share: 0.9 },
          { name: "Nothing", share: 0.5 },
        ],
      }),
    );
    expect(first?.item).toBeNull();
    expect(first?.moves).toEqual(["Earthquake", null, null, null]);
  });

  it("pads the move slots when the species has fewer than four moves", () => {
    const [first] = topCommonSets(
      usageEntry({
        moves: [{ name: "Earthquake", share: 0.9 }],
      }),
    );
    expect(first?.moves).toEqual(["Earthquake", null, null, null]);
  });

  it("honours a zero or negative count", () => {
    expect(topCommonSets(usageEntry(), 0)).toEqual([]);
  });
});
