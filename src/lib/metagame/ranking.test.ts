import { expect, test } from "vitest";
import { snapshotFixture } from "@/lib/metagame/fixture";
import { byRank, findPokemon } from "@/lib/metagame/ranking";

test("findPokemon matches case-insensitively and trims", () => {
  expect(findPokemon(snapshotFixture.pokemon, "sneasler")?.species).toBe(
    "Sneasler",
  );
  expect(findPokemon(snapshotFixture.pokemon, "  KINGAMBIT ")?.species).toBe(
    "Kingambit",
  );
});

test("findPokemon returns undefined for absent species", () => {
  expect(findPokemon(snapshotFixture.pokemon, "Pikachu")).toBeUndefined();
});

test("byRank sorts a copy by rank", () => {
  const shuffled = [...snapshotFixture.pokemon].reverse();
  const sorted = byRank(shuffled);
  expect(sorted.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(shuffled[0]?.rank).toBe(6);
  expect(sorted).not.toBe(shuffled);
});
