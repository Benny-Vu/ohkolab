import { describe, expect, it } from "vitest";

import { createDefaultSet } from "@/data";
import { defensiveWeakSpots, speedTiers } from "@/lib/team/heat-map";
import type { PokemonSet } from "@/types/pokemon";

function set(species: string, patch: Partial<PokemonSet> = {}): PokemonSet {
  return { ...createDefaultSet(species), ...patch };
}

describe("defensiveWeakSpots", () => {
  it("calls out shared weaknesses as structured spots", () => {
    const members = [set("Garchomp"), set("Dragonite"), set("Salamence")];
    expect(defensiveWeakSpots(members)).toContainEqual({
      type: "Ice",
      weak: 3,
      noResist: true,
    });
  });

  it("drops the no-resist note when something resists", () => {
    const members = [set("Garchomp"), set("Dragonite"), set("Incineroar")];
    const spots = defensiveWeakSpots(members);
    expect(spots).toContainEqual({ type: "Ice", weak: 2, noResist: false });
    expect(spots).not.toContainEqual({ type: "Ice", weak: 2, noResist: true });
  });

  it("ignores types only one Pokémon is weak to", () => {
    const members = [set("Garchomp"), set("Rotom-Wash"), set("Charizard")];
    expect(defensiveWeakSpots(members)).toEqual([]);
  });

  it("returns nothing for an empty team", () => {
    expect(defensiveWeakSpots([])).toEqual([]);
  });
});

describe("speedTiers", () => {
  it("sorts members by final speed, fastest first", () => {
    const tiers = speedTiers([
      set("Incineroar"),
      set("Garchomp"),
      set("Gengar"),
    ]);
    expect(tiers.map((tier) => tier.label)).toEqual([
      "Gengar",
      "Garchomp",
      "Incineroar",
    ]);
    expect(tiers[0]!.speed).toBeGreaterThanOrEqual(tiers[1]!.speed);
    expect(tiers[1]!.speed).toBeGreaterThanOrEqual(tiers[2]!.speed);
  });

  it("uses the nickname when one is set", () => {
    const tiers = speedTiers([set("Garchomp", { nickname: "Ace" })]);
    expect(tiers[0]!.label).toBe("Ace");
  });

  it("returns an empty list for an empty team", () => {
    expect(speedTiers([])).toEqual([]);
  });

  it("multiplies Speed for the Choice Scarf and Tailwind views", () => {
    const member = set("Garchomp");
    const base = speedTiers([member], "base")[0]!.speed;
    expect(speedTiers([member], "scarf")[0]!.speed).toBe(
      Math.floor(base * 1.5),
    );
    expect(speedTiers([member], "tailwind")[0]!.speed).toBe(base * 2);
  });

  it("reverses the base order under Trick Room", () => {
    const members = [set("Incineroar"), set("Gengar"), set("Garchomp")];
    const base = speedTiers(members).map((tier) => tier.label);
    expect(speedTiers(members, "trickRoom").map((tier) => tier.label)).toEqual(
      [...base].reverse(),
    );
  });
});
