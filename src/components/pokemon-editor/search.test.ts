import { describe, expect, it } from "vitest";

import {
  matchRank,
  normalizeSearch,
  searchOptions,
} from "@/components/pokemon-editor/search";

describe("normalizeSearch", () => {
  it("lower-cases and keeps only letters and digits", () => {
    expect(normalizeSearch("Mr. Mime")).toBe("mrmime");
    expect(normalizeSearch("Porygon-Z")).toBe("porygonz");
    expect(normalizeSearch("Flabébé")).toBe("flabebe");
    expect(normalizeSearch("  ")).toBe("");
  });
});

describe("matchRank", () => {
  it("matches everything on an empty query", () => {
    expect(matchRank("Garchomp", "")).toBe(0);
    expect(matchRank("Garchomp", "  ")).toBe(0);
  });

  it("ranks a name that starts with the query best", () => {
    expect(matchRank("Garchomp", "Garch")).toBe(0);
    expect(matchRank("Garchomp", "garch")).toBe(0);
  });

  it("ranks a later word starting with the query second", () => {
    expect(matchRank("Mr. Mime", "mime")).toBe(1);
    expect(matchRank("Porygon-Z", "z")).toBe(1);
  });

  it("ranks a name containing the query third", () => {
    expect(matchRank("Garchomp", "chomp")).toBe(2);
  });

  it("ranks a keyword match last, once the query is long enough", () => {
    expect(matchRank("Garchomp", "dragon", ["Dragon", "Ground"])).toBe(3);
    expect(matchRank("Garchomp", "dr", ["Dragon"])).toBe(-1);
  });

  it("returns -1 when nothing matches", () => {
    expect(matchRank("Bulbasaur", "chomp")).toBe(-1);
  });
});

describe("searchOptions", () => {
  const getName = (option: { name: string }) => option.name;

  it("returns the same options when the query is empty", () => {
    const options = [{ name: "Charmander" }, { name: "Arcanine" }];
    expect(searchOptions(options, "", getName)).toBe(options);
    expect(searchOptions(options, "  ", getName)).toBe(options);
  });

  it("keeps the options that match, in their original order", () => {
    const options = [
      { name: "Charmander" },
      { name: "Arcanine" },
      { name: "Charizard" },
    ];
    expect(searchOptions(options, "char", getName)).toEqual([
      { name: "Charmander" },
      { name: "Charizard" },
    ]);
  });

  it("sorts better matches first, equal ranks keep list order", () => {
    const options = [
      { name: "Charmander" },
      { name: "Arcanine" },
      { name: "Charizard" },
    ];
    expect(searchOptions(options, "ar", getName)).toEqual([
      { name: "Arcanine" },
      { name: "Charmander" },
      { name: "Charizard" },
    ]);
  });

  it("matches keywords and ranks them after name matches", () => {
    const options = [
      { name: "Garchomp", types: ["Dragon", "Ground"] },
      { name: "Dragonite", types: ["Dragon", "Flying"] },
    ];
    expect(
      searchOptions(options, "dragon", getName, (option) => option.types),
    ).toEqual([
      { name: "Dragonite", types: ["Dragon", "Flying"] },
      { name: "Garchomp", types: ["Dragon", "Ground"] },
    ]);
  });
});
