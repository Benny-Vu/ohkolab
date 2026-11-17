import { describe, expect, it } from "vitest";

import {
  buildSnapshot,
  isIngested,
  mergeIndex,
  natureShares,
  parseSpreadKey,
  snapshotPath,
  spreadShares,
  toShares,
  totalWeight,
} from "./transform.ts";
import type {
  ChaosEntry,
  ChaosFile,
  MetagameIndex,
  NameResolver,
} from "./types.ts";

// A stub resolver: fixture tests must not depend on @smogon/calc.
const names: NameResolver = {
  ability: (id) => `Ability:${id}`,
  item: (id) => `Item:${id}`,
  move: (id) => `Move:${id}`,
  species: (name) => `Species:${name}`,
};

function chaosEntry(overrides: Partial<ChaosEntry> = {}): ChaosEntry {
  return {
    usage: 0.5,
    Abilities: { "poison-touch": 800, unburden: 200 },
    Items: { "grassy-seed": 700, nothing: 300 },
    Spreads: {
      "Adamant:2/32/0/0/0/32": 500,
      "Jolly:2/32/0/0/0/32": 300,
      "Adamant:4/32/0/0/0/30": 200,
    },
    Moves: { "dire-claw": 900, "close-combat": 800, "": 100 },
    Teammates: { Rillaboom: 400, Incineroar: 300 },
    ...overrides,
  };
}

function chaosFile(
  data: Record<string, ChaosEntry>,
  battles = 1234,
): ChaosFile {
  return {
    info: {
      metagame: "gen9championsvgc2026regmc",
      cutoff: 1630,
      "number of battles": battles,
    },
    data,
  };
}

describe("parseSpreadKey", () => {
  it("parses nature and stat points in HP/Atk/Def/SpA/SpD/Spe order", () => {
    expect(parseSpreadKey("Adamant:2/32/0/0/0/32")).toEqual({
      nature: "Adamant",
      statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
    });
  });

  it("returns null for malformed keys", () => {
    expect(parseSpreadKey("Adamant")).toBeNull();
    expect(parseSpreadKey("Adamant:2/32/0/0/0")).toBeNull();
    expect(parseSpreadKey("Adamant:2/32/0/0/0/x")).toBeNull();
  });
});

describe("totalWeight", () => {
  it("sums the Abilities values", () => {
    expect(totalWeight(chaosEntry())).toBe(1000);
  });

  it("is zero without abilities", () => {
    expect(totalWeight({ usage: 0.1, Abilities: {} })).toBe(0);
  });
});

describe("toShares", () => {
  it("sorts by count, trims to the limit, and divides by the total", () => {
    const shares = toShares({ a: 200, b: 700, c: 100 }, 1000, 2, names.ability);
    expect(shares).toEqual([
      { name: "Ability:b", share: 0.7 },
      { name: "Ability:a", share: 0.2 },
    ]);
  });

  it("rounds to four decimals", () => {
    const shares = toShares({ a: 1, b: 2 }, 3, 10, names.ability);
    expect(shares).toEqual([
      { name: "Ability:b", share: 0.6667 },
      { name: "Ability:a", share: 0.3333 },
    ]);
  });

  it("returns nothing when the total is zero", () => {
    expect(toShares({ a: 1 }, 0, 10, names.ability)).toEqual([]);
  });
});

describe("natureShares", () => {
  it("sums spreads by nature before ranking", () => {
    const shares = natureShares(
      {
        "Adamant:2/32/0/0/0/32": 500,
        "Jolly:2/32/0/0/0/32": 300,
        "Adamant:4/32/0/0/0/30": 200,
      },
      1000,
      10,
    );
    expect(shares).toEqual([
      { name: "Adamant", share: 0.7 },
      { name: "Jolly", share: 0.3 },
    ]);
  });
});

describe("spreadShares", () => {
  it("keeps individual spreads with their stat points", () => {
    const spreads = spreadShares(
      {
        "Adamant:2/32/0/0/0/32": 500,
        "Jolly:2/32/0/0/0/32": 300,
      },
      1000,
      10,
    );
    expect(spreads).toEqual([
      {
        nature: "Adamant",
        statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
        share: 0.5,
      },
      {
        nature: "Jolly",
        statPoints: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
        share: 0.3,
      },
    ]);
  });

  it("skips unparsable spread keys", () => {
    expect(spreadShares({ broken: 100 }, 1000, 10)).toEqual([]);
  });
});

describe("buildSnapshot", () => {
  const chaos = chaosFile({
    Sneasler: chaosEntry({ usage: 0.3562844 }),
    Rillaboom: chaosEntry({ usage: 0.3552249 }),
    Incineroar: chaosEntry({ usage: 0.318257 }),
  });

  it("ranks by usage, not insertion order", () => {
    const snapshot = buildSnapshot(
      "doubles",
      "2026-10",
      chaos,
      names,
      "2026-11-16T18:00:00Z",
      "https://example.test",
    );
    expect(snapshot.pokemon.map((p) => p.species)).toEqual([
      "Species:Sneasler",
      "Species:Rillaboom",
      "Species:Incineroar",
    ]);
    expect(snapshot.pokemon.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it("fills the snapshot contract fields", () => {
    const snapshot = buildSnapshot(
      "doubles",
      "2026-10",
      chaos,
      names,
      "2026-11-16T18:00:00Z",
      "https://example.test",
    );
    expect(snapshot.format).toBe("doubles");
    expect(snapshot.regulation).toBe("M-C");
    expect(snapshot.period).toBe("2026-10");
    expect(snapshot.battles).toBe(1234);
    expect(snapshot.generatedAt).toBe("2026-11-16T18:00:00Z");
    expect(snapshot.source).toEqual({
      id: "showdown-ladder",
      label:
        "Pok\u00e9mon Showdown ladder, October 2026, rating 1630+, via smogon.com/stats",
      url: "https://example.test",
      formatId: "gen9championsvgc2026regmc",
      ratingCutoff: 1630,
    });
  });

  it("maps every list through the resolver", () => {
    const [sneasler] = buildSnapshot(
      "doubles",
      "2026-10",
      chaos,
      names,
      "now",
      "url",
    ).pokemon;
    expect(sneasler.usage).toBe(0.3562844);
    expect(sneasler.abilities[0]).toEqual({
      name: "Ability:poison-touch",
      share: 0.8,
    });
    expect(sneasler.items[0]).toEqual({ name: "Item:grassy-seed", share: 0.7 });
    expect(sneasler.moves[0]).toEqual({ name: "Move:dire-claw", share: 0.9 });
    expect(sneasler.natures[0]).toEqual({ name: "Adamant", share: 0.7 });
    expect(sneasler.teammates[0]).toEqual({
      name: "Species:Rillaboom",
      share: 0.4,
    });
  });

  it("keeps usage null when the source omits it", () => {
    const snapshot = buildSnapshot(
      "singles",
      "2026-10",
      chaosFile({ Aegislash: chaosEntry({ usage: undefined }) }),
      names,
      "now",
      "url",
    );
    expect(snapshot.pokemon[0].usage).toBeNull();
  });
});

describe("snapshotPath", () => {
  it("points at the public data route", () => {
    expect(snapshotPath("2026-10", "doubles")).toBe(
      "/data/metagame/2026-10/doubles.json",
    );
  });
});

describe("isIngested", () => {
  const index: MetagameIndex = {
    latest: {
      singles: "/data/metagame/2026-10/singles.json",
      doubles: "/data/metagame/2026-10/doubles.json",
    },
    snapshots: [
      {
        format: "singles",
        period: "2026-10",
        regulation: "M-C",
        path: "/data/metagame/2026-10/singles.json",
      },
      {
        format: "doubles",
        period: "2026-10",
        regulation: "M-C",
        path: "/data/metagame/2026-10/doubles.json",
      },
    ],
  };

  it("is true when both formats are present", () => {
    expect(isIngested(index, "2026-10")).toBe(true);
  });

  it("is false when a format is missing", () => {
    expect(isIngested(index, "2026-09")).toBe(false);
    expect(
      isIngested(
        { ...index, snapshots: index.snapshots.slice(0, 1) },
        "2026-10",
      ),
    ).toBe(false);
  });

  it("is false without an index", () => {
    expect(isIngested(null, "2026-10")).toBe(false);
  });
});

describe("mergeIndex", () => {
  it("merges, deduplicates, and sorts by period", () => {
    const october = buildSnapshot(
      "doubles",
      "2026-10",
      chaosFile({ A: chaosEntry() }),
      names,
      "now",
      "url",
    );
    const september = buildSnapshot(
      "doubles",
      "2026-09",
      chaosFile({ A: chaosEntry() }),
      names,
      "now",
      "url",
    );
    const index = mergeIndex(null, [october, september]);
    expect(index.snapshots.map((s) => s.period)).toEqual([
      "2026-09",
      "2026-10",
    ]);
    expect(index.latest.doubles).toBe("/data/metagame/2026-10/doubles.json");
  });

  it("replaces an existing period instead of duplicating it", () => {
    const first = buildSnapshot(
      "doubles",
      "2026-10",
      chaosFile({ A: chaosEntry() }),
      names,
      "now",
      "url",
    );
    const rebuilt = buildSnapshot(
      "doubles",
      "2026-10",
      chaosFile({ B: chaosEntry() }),
      names,
      "later",
      "url",
    );
    const index = mergeIndex(mergeIndex(null, [first]), [rebuilt]);
    expect(index.snapshots).toHaveLength(1);
    expect(index.latest.doubles).toBe("/data/metagame/2026-10/doubles.json");
  });
});
