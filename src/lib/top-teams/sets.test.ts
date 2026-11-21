import { describe, expect, it } from "vitest";

import { topTeamMemberToSet } from "@/lib/top-teams/sets";
import type { PokemonUsage } from "@/lib/metagame/types";
import type { TopTeamMember } from "@/lib/top-teams/types";
import type { PokemonSet } from "@/types/pokemon";

/** A published member: species, item, ability, nature, tera, moves — no SP. */
function member(overrides: Partial<TopTeamMember> = {}): TopTeamMember {
  return {
    species: "Garchomp",
    item: "Life Orb",
    ability: "Rough Skin",
    nature: "Adamant",
    tera: "Dragon",
    moves: ["Earthquake", "Dragon Claw", "Protect", "Fire Fang"],
    ...overrides,
  };
}

/** Usage data carrying one common spread. */
function usageWithSpread(): PokemonUsage {
  return {
    species: "Garchomp",
    rank: 1,
    usage: 0.5,
    abilities: [],
    items: [],
    moves: [],
    natures: [],
    spreads: [
      {
        nature: "Jolly",
        statPoints: { hp: 4, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
        share: 0.4,
      },
    ],
    teammates: [],
  };
}

describe("topTeamMemberToSet", () => {
  it("borrows the most common SP spread from the usage data", () => {
    const built = topTeamMemberToSet(member(), usageWithSpread());
    expect(built?.spSource).toBe("usage");
    const set = built?.set as PokemonSet;
    // The published nature stands, even when the common spread disagrees.
    expect(set.nature).toBe("Adamant");
    // The borrowed spread is clamped into Champions' 66-point budget.
    const total =
      set.statPoints.hp +
      set.statPoints.atk +
      set.statPoints.def +
      set.statPoints.spa +
      set.statPoints.spd +
      set.statPoints.spe;
    expect(total).toBeLessThanOrEqual(66);
    expect(set.moves).toEqual([
      "Earthquake",
      "Dragon Claw",
      "Protect",
      "Fire Fang",
    ]);
  });

  it("falls back to a neutral spread when no usage data exists", () => {
    const built = topTeamMemberToSet(member(), null);
    expect(built?.spSource).toBe("neutral");
    expect(built?.set.statPoints).toEqual({
      hp: 0,
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
    });
  });

  it("keeps a Mega as the base species holding its stone", () => {
    // The sheet publishes the Mega forme with the stone as the item; the
    // app stores the base species plus the item.
    const built = topTeamMemberToSet(
      member({
        species: "Charizard-Mega-Y",
        item: "Charizardite Y",
        ability: "Drought",
      }),
      null,
    );
    expect(built?.set.species).toBe("Charizard");
    expect(built?.set.item).toBe("Charizardite Y");
  });

  it("returns null for a species the app does not know", () => {
    expect(
      topTeamMemberToSet(member({ species: "Not a Pokemon" }), null),
    ).toBeNull();
  });

  it("pads a short move list to four slots", () => {
    const built = topTeamMemberToSet(member({ moves: ["Earthquake"] }), null);
    expect(built?.set.moves).toEqual(["Earthquake", null, null, null]);
  });
});
