import { describe, expect, it, vi } from "vitest";

import {
  displayDescription,
  displayName,
  loadJapaneseNames,
  matchesDisplayName,
} from "@/data/display-names";
import { getAbility, getItem } from "@/data";

// A tiny stand-in for the committed ja-names.json; the real file's parity
// has its own test in src/data/i18n.
const { fixture, imports } = vi.hoisted(() => ({
  fixture: {
    species: { garchomp: "ガブリアス", garchompmega: "メガガブリアス" },
    move: { earthquake: "じしん" },
    ability: { intimidate: "いかく" },
    item: { lifeorb: "いのちのたま" },
    type: { fire: "ほのお" },
    nature: { hardy: "がんばりや" },
    abilityDescription: { intimidate: "いかくの　せつめい" },
    itemDescription: { lifeorb: "いのちのたまの　せつめい" },
  },
  imports: { count: 0 },
}));

vi.mock("@/data/i18n/ja-names.json", () => {
  imports.count += 1;
  return { default: fixture };
});

describe("displayName", () => {
  it("keeps English names in English", () => {
    expect(displayName("species", "garchomp", "en")).toBe("Garchomp");
    expect(displayName("move", "Earthquake", "en")).toBe("Earthquake");
    expect(displayName("ability", "Intimidate", "en")).toBe("Intimidate");
    expect(displayName("item", "Life Orb", "en")).toBe("Life Orb");
    expect(displayName("type", "Fire", "en")).toBe("Fire");
    expect(displayName("nature", "Hardy", "en")).toBe("Hardy");
    expect(imports.count).toBe(0);
  });

  it("falls back to English for Japanese while the chunk is not loaded", () => {
    expect(displayName("species", "garchomp", "ja")).toBe("Garchomp");
    // displayName itself never starts the download.
    expect(imports.count).toBe(0);
  });

  it("looks names up in the loaded Japanese data", async () => {
    await loadJapaneseNames();
    expect(imports.count).toBe(1);
    expect(displayName("species", "garchomp", "ja")).toBe("ガブリアス");
    expect(displayName("species", "Garchomp-Mega", "ja")).toBe(
      "メガガブリアス",
    );
    expect(displayName("move", "earthquake", "ja")).toBe("じしん");
    expect(displayName("ability", "Intimidate", "ja")).toBe("いかく");
    expect(displayName("item", "Life Orb", "ja")).toBe("いのちのたま");
    expect(displayName("type", "fire", "ja")).toBe("ほのお");
    expect(displayName("nature", "hardy", "ja")).toBe("がんばりや");
  });

  it("stays English in English even after the load", () => {
    expect(displayName("species", "garchomp", "en")).toBe("Garchomp");
    expect(displayName("type", "Fire", "en")).toBe("Fire");
  });

  it("falls back to English for ids without a Japanese name", () => {
    // In the roster (so the English name comes from the data) but absent
    // from the fixture.
    expect(displayName("species", "charizard", "ja")).toBe("Charizard");
    // Not in the roster at all: the id itself is the best we have.
    expect(displayName("move", "nope", "ja")).toBe("nope");
  });
});

describe("displayDescription", () => {
  // The displayName tests above have already loaded the fixture chunk by
  // the time this describe runs, so only the loaded states are covered
  // here; the not-loaded fallback is the same guard displayName uses.

  it("keeps the English short description in English", () => {
    expect(displayDescription("ability", "Intimidate", "en")).toBe(
      getAbility("Intimidate")?.shortDesc,
    );
    expect(displayDescription("item", "Life Orb", "en")).toBe(
      getItem("Life Orb")?.shortDesc,
    );
  });

  it("looks descriptions up in the loaded Japanese data", () => {
    expect(displayDescription("ability", "intimidate", "ja")).toBe(
      "いかくの　せつめい",
    );
    expect(displayDescription("item", "Life Orb", "ja")).toBe(
      "いのちのたまの　せつめい",
    );
  });

  it("falls back to the English short description without Japanese text", () => {
    // In the roster but absent from the fixture's description sections.
    expect(displayDescription("ability", "Blaze", "ja")).toBe(
      getAbility("Blaze")?.shortDesc,
    );
    expect(displayDescription("item", "Leftovers", "ja")).toBe(
      getItem("Leftovers")?.shortDesc,
    );
    // Not in the roster at all: there is no description at all.
    expect(displayDescription("ability", "nope", "ja")).toBe("");
    expect(displayDescription("item", "nope", "ja")).toBe("");
  });
});

describe("matchesDisplayName", () => {
  it("matches Latin case-insensitively as a substring", () => {
    expect(matchesDisplayName("gar", "Garchomp", "ガブリアス")).toBe(true);
    expect(matchesDisplayName("CHOMP", "Garchomp", "ガブリアス")).toBe(true);
    expect(matchesDisplayName("garchomp", "Garchomp", "ガブリアス")).toBe(true);
    expect(matchesDisplayName("chompz", "Garchomp", "ガブリアス")).toBe(false);
  });

  it("matches kana and kanji as plain substrings", () => {
    expect(matchesDisplayName("ガブ", "Garchomp", "ガブリアス")).toBe(true);
    expect(matchesDisplayName("リアス", "Garchomp", "ガブリアス")).toBe(true);
    expect(matchesDisplayName("ガブゾ", "Garchomp", "ガブリアス")).toBe(false);
  });

  it("matches half-width katakana against full-width names", () => {
    expect(matchesDisplayName("ｶﾞﾌﾞﾘｱｽ", "Garchomp", "ガブリアス")).toBe(true);
    expect(matchesDisplayName("ｶﾞﾌﾞ", "Garchomp", "ガブリアス")).toBe(true);
  });

  it("folds full-width Latin queries and Latin accents", () => {
    expect(matchesDisplayName("ＧＡＲ", "Garchomp", "ガブリアス")).toBe(true);
    expect(matchesDisplayName("flabebe", "Flabébé", "フラベベ")).toBe(true);
  });

  it("matches an empty query and needs a Japanese name for kana", () => {
    expect(matchesDisplayName("", "Garchomp", "ガブリアス")).toBe(true);
    expect(matchesDisplayName("gar", "Garchomp")).toBe(true);
    expect(matchesDisplayName("ガブ", "Garchomp")).toBe(false);
    expect(matchesDisplayName("ガブ", "Garchomp", null)).toBe(false);
  });
});
