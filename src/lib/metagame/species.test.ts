import { expect, test } from "vitest";
import { resolveUsageSpecies } from "@/lib/metagame/species";
import { speedTiers } from "@/lib/metagame/speed-tiers";
import { usageToSet } from "@/lib/metagame/sets";
import type { PokemonUsage } from "@/lib/metagame/types";

const aegislash: PokemonUsage = {
  species: "Aegislash",
  rank: 30,
  usage: 0.12,
  abilities: [{ name: "Stance Change", share: 1 }],
  items: [{ name: "Leftovers", share: 0.5 }],
  moves: [{ name: "King's Shield", share: 0.9 }],
  natures: [{ name: "Adamant", share: 0.6 }],
  spreads: [
    {
      nature: "Adamant",
      statPoints: { hp: 24, atk: 24, def: 0, spa: 0, spd: 8, spe: 0 },
      share: 0.4,
    },
  ],
  teammates: [],
};

test("resolves base names the roster only has formes of", () => {
  expect(resolveUsageSpecies("Aegislash")?.name).toBe("Aegislash-Shield");
});

test("resolves exact names, including battle-only formes", () => {
  expect(resolveUsageSpecies("Charizard-Mega-Y")?.name).toBe(
    "Charizard-Mega-Y",
  );
  expect(resolveUsageSpecies("Sneasler")?.name).toBe("Sneasler");
});

test("unknown names stay undefined", () => {
  expect(resolveUsageSpecies("Missingno")).toBeUndefined();
});

test("speed tiers include Aegislash via its Shield forme", () => {
  const tiers = speedTiers([aegislash]);
  expect(tiers).toHaveLength(1);
  expect(tiers[0]?.species).toBe("Aegislash");
  expect(tiers[0]?.maxSpeed).toBe(123);
  expect(tiers[0]?.minSpeed).toBe(72);
});

test("usageToSet builds a set for Aegislash", () => {
  const set = usageToSet(aegislash);
  expect(set?.species).toBe("Aegislash-Shield");
  expect(set?.item).toBe("Leftovers");
  expect(set?.ability).toBe("Stance Change");
});
