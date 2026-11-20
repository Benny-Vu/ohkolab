import { describe, expect, it } from "vitest";

import { DEFAULT_NATURE, getSpecies } from "@/data";
import type { CommonSet } from "@/lib/metagame/common-sets";
import {
  assumedInput,
  commonSetToInput,
  customInput,
  opponentsFromText,
  speciesFromLine,
} from "@/features/battle/opponent-input";

function commonSet(overrides: Partial<CommonSet> = {}): CommonSet {
  return {
    index: 1,
    item: "Choice Scarf",
    ability: "Rough Skin",
    nature: "Jolly",
    statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
    moves: ["Earthquake", "Protect", "Rock Slide", "Fire Fang"],
    speciesUsage: 0.3,
    assumed: false,
    ...overrides,
  };
}

describe("speciesFromLine", () => {
  it("resolves names case-insensitively and with loose punctuation", () => {
    expect(speciesFromLine("garchomp")).toBe("Garchomp");
    expect(speciesFromLine("Mr. Mime")).toBe("Mr. Mime");
  });

  it("falls back to the team-legal base of a battle-only forme", () => {
    expect(speciesFromLine("Charizard-Mega-Y")).toBe("Charizard");
  });

  it("returns null for a name the roster does not have", () => {
    expect(speciesFromLine("Missingno")).toBeNull();
  });
});

describe("commonSetToInput", () => {
  it("keeps the names the roster knows and the provenance from the data", () => {
    const input = commonSetToInput("Garchomp", commonSet());
    expect(input).toMatchObject({
      species: "Garchomp",
      provenance: "common",
    });
    expect(input.set).toMatchObject({
      species: "Garchomp",
      item: "Choice Scarf",
      ability: "Rough Skin",
      nature: "Jolly",
      moves: ["Earthquake", "Protect", "Rock Slide", "Fire Fang"],
    });
  });

  it("drops unknown names and falls back to the species' first ability", () => {
    const input = commonSetToInput(
      "Garchomp",
      commonSet({
        item: "Leftovers",
        ability: "Speed Boost",
        nature: "Hardy",
        moves: ["Earthquake", "Splash", null, null],
      }),
    );
    expect(input.set.item).toBe("Leftovers");
    expect(input.set.ability).toBe(getSpecies("Garchomp")?.abilities[0]);
    expect(input.set.moves).toEqual(["Earthquake", null, null, null]);
  });

  it("falls back when an item cannot be held or a nature is unknown", () => {
    const input = commonSetToInput(
      "Garchomp",
      commonSet({
        item: "Blastoisite",
        nature: "Nonsense",
      }),
    );
    expect(input.set.item).toBeNull();
    expect(input.set.nature).toBe(DEFAULT_NATURE);
  });

  it("labels a set without spread data as assumed and keeps the spread empty", () => {
    const input = commonSetToInput(
      "Garchomp",
      commonSet({ assumed: true, nature: null }),
    );
    expect(input.provenance).toBe("assumed");
    expect(input.set.statPoints).toEqual({
      hp: 0,
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
    });
  });

  it("trims an over-limit spread to the legal total, fullest stats first", () => {
    const input = commonSetToInput(
      "Garchomp",
      commonSet({
        statPoints: { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      }),
    );
    const total = Object.values(input.set.statPoints).reduce(
      (sum, value) => sum + value,
      0,
    );
    expect(total).toBe(66);
    // The 30 excess points come off the fullest stats in turn, so the
    // spread's shape survives: 32/32/32 becomes 22/22/22.
    expect(input.set.statPoints.hp).toBe(22);
    expect(input.set.statPoints.atk).toBe(22);
    expect(input.set.statPoints.spe).toBe(22);
  });
});

describe("provenance shapes", () => {
  it("assumedInput gives the default set with no moves", () => {
    expect(assumedInput("Incineroar")).toMatchObject({
      species: "Incineroar",
      provenance: "assumed",
      set: {
        ability: getSpecies("Incineroar")?.abilities[0] ?? null,
        moves: [null, null, null, null],
      },
    });
  });

  it("customInput keeps the user's set untouched", () => {
    const input = customInput({
      species: "Garchomp",
      item: null,
      ability: "Rough Skin",
      nature: "Jolly",
      statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      moves: ["Earthquake", null, null, null],
    });
    expect(input.provenance).toBe("custom");
    expect(input.species).toBe("Garchomp");
  });
});

describe("opponentsFromText", () => {
  it("reads a Showdown export as custom slots", () => {
    const paste = [
      "Garchomp @ Choice Scarf",
      "Ability: Rough Skin",
      "Jolly Nature",
      "EVs: 32 Atk / 32 Spe",
      "- Earthquake",
      "",
      "Incineroar @ Leftovers",
      "Ability: Intimidate",
      "Careful Nature",
      "- Flare Blitz",
    ].join("\n");
    const { inputs, warnings } = opponentsFromText(paste);
    expect(inputs).toHaveLength(2);
    expect(inputs.map((input) => input.provenance)).toEqual([
      "custom",
      "custom",
    ]);
    expect(inputs[0]?.set.item).toBe("Choice Scarf");
    expect(warnings).toEqual([]);
  });

  it("reads a plain list of species names as assumed slots", () => {
    const { inputs } = opponentsFromText("Garchomp\nIncineroar\nRillaboom");
    expect(inputs.map((input) => input.species)).toEqual([
      "Garchomp",
      "Incineroar",
      "Rillaboom",
    ]);
    expect(inputs.every((input) => input.provenance === "assumed")).toBe(true);
  });

  it("reports the names it could not resolve", () => {
    const { inputs, warnings } = opponentsFromText("Garchomp\nMissingno");
    expect(inputs.map((input) => input.species)).toEqual(["Garchomp"]);
    expect(warnings[0]).toContain("Missingno");
  });

  it("keeps at most six Pokémon", () => {
    const { inputs } = opponentsFromText(
      ["One", "Two", "Three", "Four", "Five", "Six", "Seven"]
        .map(() => "Garchomp")
        .join("\n"),
    );
    expect(inputs).toHaveLength(6);
  });

  it("gives nothing for text without a single species", () => {
    expect(opponentsFromText("hello world")).toEqual({
      inputs: [],
      warnings: expect.any(Array),
    });
  });
});
