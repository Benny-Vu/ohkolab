import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { toID } from "@/data/gen";
import {
  displayDescription,
  displayName,
  loadJapaneseNames,
  type JapaneseNames,
} from "@/data/display-names";
import { listAbilities, listItems, listMoves, listSpecies } from "@/data";
import { listNatures } from "@/data/natures";
import { TYPE_NAMES } from "@/types/pokemon";

// Vitest runs from the repo root, so the committed data is a stable path.
// Read from disk on purpose: the test must not pull the JSON into the
// app's entry chunk (it is loaded lazily at runtime).
const names = JSON.parse(
  readFileSync(
    join(process.cwd(), "src", "data", "i18n", "ja-names.json"),
    "utf8",
  ),
) as JapaneseNames;

/** The ids the roster actually has, per name kind. */
const rosterIds: Record<keyof JapaneseNames, Set<string>> = {
  species: new Set(
    listSpecies({ includeBattleOnly: true }).map((info) => info.id),
  ),
  move: new Set(listMoves().map((info) => info.id)),
  ability: new Set(listAbilities().map((info) => info.id)),
  item: new Set(listItems().map((info) => info.id)),
  type: new Set(TYPE_NAMES.map((name) => toID(name))),
  nature: new Set(listNatures().map((info) => toID(info.name))),
  abilityDescription: new Set(listAbilities().map((info) => info.id)),
  itemDescription: new Set(listItems().map((info) => info.id)),
};

describe("committed Japanese names", () => {
  it("covers all eight sections", () => {
    for (const kind of Object.keys(rosterIds) as (keyof JapaneseNames)[]) {
      expect(names[kind], kind).toBeTruthy();
    }
  });

  it("contains only ids that exist in the roster", () => {
    expect(Object.keys(names.species).length).toBeGreaterThan(0);
    for (const kind of Object.keys(rosterIds) as (keyof JapaneseNames)[]) {
      for (const [id, name] of Object.entries(names[kind])) {
        expect(rosterIds[kind].has(id), `${kind}: ${id}`).toBe(true);
        expect(typeof name, `${kind}: ${id}`).toBe("string");
        expect(name.length, `${kind}: ${id}`).toBeGreaterThan(0);
      }
    }
  });

  it("loads and translates the committed data", async () => {
    // Still English before the chunk is in.
    expect(displayName("species", "garchomp", "ja")).toBe("Garchomp");
    await loadJapaneseNames();
    expect(displayName("species", "garchomp", "ja")).toBe("ガブリアス");
    expect(displayName("species", "kingambit", "ja")).toBe("ドドゲザン");
    expect(displayName("species", "Garchomp-Mega", "ja")).toBe(
      "メガガブリアス",
    );
    expect(displayName("type", "Fire", "ja")).toBe("ほのお");
    expect(displayName("nature", "Hardy", "ja")).toBe("がんばりや");
  });

  it("describes mainstream abilities and items in Japanese", () => {
    expect(displayDescription("ability", "intimidate", "ja")).toMatch(
      /^[぀-ヿ㐀-鿿]/,
    );
    expect(displayDescription("item", "lifeorb", "ja")).toMatch(/^[぀-ヿ㐀-鿿]/);
  });
});
