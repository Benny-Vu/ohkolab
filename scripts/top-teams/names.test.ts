import { describe, expect, it } from "vitest";

import { createSheetResolver } from "./names.ts";
import type { LimitlessSheetMember } from "./types.ts";

// Unlike the transform fixtures, these tests use the real resolver
// (@smogon/calc generation 0 plus @pkmn/dex), because the folding rules must
// match src/data exactly. No network: everything comes from the libraries.

const resolver = createSheetResolver();

function sheet(
  overrides: Partial<LimitlessSheetMember> = {},
): LimitlessSheetMember {
  return {
    id: "whimsicott",
    name: "Whimsicott",
    item: "Focus Sash",
    ability: "Prankster",
    attacks: ["Moonblast", "Tailwind", null, ""],
    nature: "Modest",
    tera: null,
    ...overrides,
  };
}

describe("createSheetResolver", () => {
  it("resolves a plain member to the app's names", () => {
    expect(resolver.resolve(sheet())).toEqual({
      species: "Whimsicott",
      item: "Focus Sash",
      ability: "Prankster",
      nature: "Modest",
      tera: null,
      moves: ["Moonblast", "Tailwind"],
    });
  });

  it("canonicalizes names the sheet spells differently", () => {
    const result = resolver.resolve(
      sheet({ attacks: ["Ancient Power", "Extreme Speed"] }),
    );
    expect(result).toMatchObject({
      moves: ["Ancient Power", "Extreme Speed"],
    });
  });

  it("keeps a base species holding its Mega Stone as the app models it", () => {
    const result = resolver.resolve(
      sheet({
        id: "charizard",
        name: "Charizard",
        item: "Charizardite Y",
        ability: "Blaze",
      }),
    );
    expect(result).toMatchObject({
      species: "Charizard",
      item: "Charizardite Y",
    });
  });

  it("keeps a battle-legal special forme as its own species", () => {
    // Eternal Flower Floette is a real pick in Champions, with its own Mega.
    const result = resolver.resolve(
      sheet({
        id: "floette-eternal",
        name: "Eternal Flower Floette",
        item: "Floettite",
        ability: "Flower Veil",
      }),
    );
    expect(result).toMatchObject({
      species: "Floette-Eternal",
      item: "Floettite",
    });
  });

  it("folds a battle-only Mega forme to the base species and its stone", () => {
    const result = resolver.resolve(
      sheet({
        id: "charizard-mega-y",
        name: "Mega Charizard Y",
        item: null,
        ability: "Drought",
        attacks: ["Heat Wave"],
      }),
    );
    expect(result).toMatchObject({
      species: "Charizard",
      item: "Charizardite Y",
    });
  });

  it("resolves a base name whose roster only has formes of it", () => {
    // The app's resolveUsageSpecies picks Aegislash's first team-legal forme.
    const result = resolver.resolve(
      sheet({ id: "aegislash", name: "Aegislash" }),
    );
    expect(result).toMatchObject({ species: "Aegislash-Shield" });
  });

  it("drops a battle-only forme that is not a Mega, instead of fudging", () => {
    const result = resolver.resolve(
      sheet({ id: "aegislash-blade", name: "Aegislash-Blade" }),
    );
    expect(result).toEqual({
      field: "battle-only",
      value: expect.stringContaining("aegislash-blade"),
    });
  });

  it("fails an unknown species instead of keeping it", () => {
    const result = resolver.resolve(
      sheet({ id: "missingmon", name: "Missingmon" }),
    );
    expect(result).toEqual({
      field: "species",
      value: "missingmon (Missingmon)",
    });
  });

  it("fails unknown items, abilities, natures, tera types and moves", () => {
    expect(resolver.resolve(sheet({ item: "Not An Item" }))).toMatchObject({
      field: "item",
    });
    expect(
      resolver.resolve(sheet({ ability: "Not An Ability" })),
    ).toMatchObject({
      field: "ability",
    });
    expect(resolver.resolve(sheet({ nature: "Sassyish" }))).toMatchObject({
      field: "nature",
    });
    expect(resolver.resolve(sheet({ tera: "Nuclear" }))).toMatchObject({
      field: "tera",
    });
    expect(resolver.resolve(sheet({ attacks: ["Not A Move"] }))).toMatchObject({
      field: "moves",
    });
  });

  it("fails a member whose sheet lists no moves at all", () => {
    const result = resolver.resolve(sheet({ attacks: [null, null, "", null] }));
    expect(result).toEqual({ field: "no-moves", value: "Whimsicott" });
  });
});
