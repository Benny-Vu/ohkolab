import { expect, test } from "vitest";
import { snapshotFixture } from "@/lib/metagame/fixture";
import { speedTiers } from "@/lib/metagame/speed-tiers";
import type { PokemonUsage } from "@/lib/metagame/types";

const emptyUsage: Omit<PokemonUsage, "species" | "rank"> = {
  usage: null,
  abilities: [],
  items: [],
  moves: [],
  natures: [],
  spreads: [],
  teammates: [],
};

test("computes tiers in usage-rank order with per-spread speeds", () => {
  const tiers = speedTiers(snapshotFixture.pokemon);
  expect(tiers.map((tier) => tier.species)).toEqual([
    "Sneasler",
    "Rillaboom",
    "Incineroar",
    "Kingambit",
    "Charizard-Mega-Y",
    "Archaludon",
  ]);

  const [sneasler, rillaboom, incineroar, kingambit, charizard, archaludon] =
    tiers;
  if (
    !sneasler ||
    !rillaboom ||
    !incineroar ||
    !kingambit ||
    !charizard ||
    !archaludon
  ) {
    throw new Error("expected six tiers");
  }

  expect(sneasler.entries).toEqual([
    { nature: "Jolly", speedStatPoints: 32, share: 0.58, speed: 189 },
    { nature: "Hasty", speedStatPoints: 32, share: 0.21, speed: 189 },
  ]);
  expect(sneasler.maxSpeed).toBe(189);
  expect(sneasler.minSpeed).toBe(126);
  expect(sneasler.unburden).toBe(true);
  expect(sneasler.choiceScarf).toBe(false);

  expect(rillaboom.entries).toEqual([
    { nature: "Adamant", speedStatPoints: 32, share: 0.44, speed: 137 },
    { nature: "Jolly", speedStatPoints: 32, share: 0.31, speed: 150 },
  ]);
  expect(rillaboom.maxSpeed).toBe(150);
  expect(rillaboom.minSpeed).toBe(94);
  expect(rillaboom.choiceScarf).toBe(true);
  expect(rillaboom.unburden).toBe(false);

  expect(incineroar.entries).toEqual([
    { nature: "Careful", speedStatPoints: 0, share: 0.47, speed: 80 },
    { nature: "Adamant", speedStatPoints: 24, share: 0.22, speed: 104 },
  ]);
  expect(incineroar.maxSpeed).toBe(123);
  expect(incineroar.minSpeed).toBe(72);

  expect(kingambit.entries).toEqual([
    { nature: "Adamant", speedStatPoints: 20, share: 0.51, speed: 90 },
    { nature: "Brave", speedStatPoints: 0, share: 0.27, speed: 63 },
  ]);
  expect(kingambit.maxSpeed).toBe(112);
  expect(kingambit.minSpeed).toBe(63);

  expect(charizard.entries).toEqual([
    { nature: "Timid", speedStatPoints: 32, share: 0.66, speed: 167 },
    { nature: "Modest", speedStatPoints: 28, share: 0.24, speed: 148 },
  ]);
  expect(charizard.maxSpeed).toBe(167);
  expect(charizard.minSpeed).toBe(108);

  expect(archaludon.entries).toEqual([
    { nature: "Modest", speedStatPoints: 28, share: 0.58, speed: 133 },
    { nature: "Timid", speedStatPoints: 32, share: 0.19, speed: 150 },
  ]);
  expect(archaludon.maxSpeed).toBe(150);
  expect(archaludon.minSpeed).toBe(94);
});

test("skips species unknown to the dex", () => {
  const unknown: PokemonUsage = {
    ...emptyUsage,
    species: "Missingno",
    rank: 7,
  };
  const tiers = speedTiers([...snapshotFixture.pokemon, unknown]);
  expect(tiers).toHaveLength(6);
  expect(tiers.map((tier) => tier.species)).not.toContain("Missingno");
});
