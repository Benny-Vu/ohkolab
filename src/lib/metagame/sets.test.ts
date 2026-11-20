import { expect, test } from "vitest";
import { snapshotFixture } from "@/lib/metagame/fixture";
import { usageToSet } from "@/lib/metagame/sets";
import type { PokemonUsage } from "@/lib/metagame/types";

function usage(species: string): PokemonUsage {
  const found = snapshotFixture.pokemon.find(
    (entry) => entry.species === species,
  );
  if (!found) throw new Error(`fixture is missing ${species}`);
  return found;
}

test("builds the most common set from usage data", () => {
  expect(usageToSet(usage("Sneasler"))).toEqual({
    species: "Sneasler",
    item: "Focus Sash",
    ability: "Poison Touch",
    nature: "Jolly",
    statPoints: { hp: 0, atk: 24, def: 0, spa: 0, spd: 0, spe: 32 },
    moves: ["Close Combat", "Dire Claw", "U-turn", "Protect"],
  });
});

test("caps moves at four", () => {
  const set = usageToSet(usage("Incineroar"));
  expect(set?.moves).toEqual([
    "Fake Out",
    "Knock Off",
    "Parting Shot",
    "Flare Blitz",
  ]);
});

test("battle-only Mega formes become the base species holding its stone", () => {
  expect(usageToSet(usage("Charizard-Mega-Y"))).toEqual({
    species: "Charizard",
    item: "Charizardite Y",
    // The Mega's own ability (Drought) is not legal on the base species
    // the set is stored under, so it falls back to Charizard's first.
    ability: "Blaze",
    nature: "Timid",
    statPoints: { hp: 0, atk: 0, def: 0, spa: 28, spd: 0, spe: 32 },
    moves: ["Heat Wave", "Overheat", "Protect", "Fire Blast"],
  });
});

test("unresolvable items become null", () => {
  const set = usageToSet(usage("Archaludon"));
  expect(set?.species).toBe("Archaludon");
  expect(set?.item).toBeNull();
});

test("unknown species yield null", () => {
  const unknown: PokemonUsage = {
    species: "Missingno",
    rank: 7,
    usage: null,
    abilities: [],
    items: [],
    moves: [],
    natures: [],
    spreads: [],
    teammates: [],
  };
  expect(usageToSet(unknown)).toBeNull();
});

test("clamps oversized spreads to the 66 SP budget", () => {
  const set = usageToSet({
    ...usage("Sneasler"),
    spreads: [
      {
        nature: "Jolly",
        statPoints: { hp: 32, atk: 32, def: 32, spa: 32, spd: 32, spe: 32 },
        share: 1,
      },
    ],
  });
  expect(set?.statPoints).toEqual({
    hp: 11,
    atk: 11,
    def: 11,
    spa: 11,
    spd: 11,
    spe: 11,
  });
});

test("empty spreads fall back to Hardy with no Stat Points", () => {
  const set = usageToSet({ ...usage("Sneasler"), spreads: [] });
  expect(set?.nature).toBe("Hardy");
  expect(set?.statPoints).toEqual({
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  });
});

test("empty ability lists fall back to the species' first ability", () => {
  const set = usageToSet({ ...usage("Sneasler"), abilities: [] });
  expect(set?.ability).toBe("Pressure");
});

test("empty item lists yield no item", () => {
  const set = usageToSet({ ...usage("Sneasler"), items: [] });
  expect(set?.item).toBeNull();
});
