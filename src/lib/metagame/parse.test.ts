import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { indexFixture, snapshotFixture } from "@/lib/metagame/fixture";
import {
  parseMetagameIndex,
  parseMetagameSnapshot,
} from "@/lib/metagame/parse";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function snapshotVariant(
  mutate: (draft: Record<string, unknown>) => void,
): unknown {
  const draft = JSON.parse(JSON.stringify(snapshotFixture)) as Record<
    string,
    unknown
  >;
  mutate(draft);
  return draft;
}

function indexVariant(
  mutate: (draft: Record<string, unknown>) => void,
): unknown {
  const draft = JSON.parse(JSON.stringify(indexFixture)) as Record<
    string,
    unknown
  >;
  mutate(draft);
  return draft;
}

function firstPokemon(draft: Record<string, unknown>): Record<string, unknown> {
  const pokemon = draft.pokemon as Record<string, unknown>[];
  if (!pokemon[0]) throw new Error("fixture has no pokemon");
  return pokemon[0];
}

test("accepts a valid snapshot", () => {
  expect(parseMetagameSnapshot(snapshotFixture)).toEqual(snapshotFixture);
});

test("accepts a snapshot with extra properties", () => {
  const value = snapshotVariant((draft) => {
    draft.extra = "tolerated";
    firstPokemon(draft).extra = "also tolerated";
  });
  expect(parseMetagameSnapshot(value)).not.toBeNull();
});

test("rejects non-records", () => {
  expect(parseMetagameSnapshot(null)).toBeNull();
  expect(parseMetagameSnapshot("nope")).toBeNull();
  expect(parseMetagameSnapshot(42)).toBeNull();
  expect(parseMetagameSnapshot([snapshotFixture])).toBeNull();
});

test("rejects unknown formats", () => {
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        draft.format = "triples";
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        delete draft.format;
      }),
    ),
  ).toBeNull();
});

test("rejects empty regulations", () => {
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        draft.regulation = "  ";
      }),
    ),
  ).toBeNull();
});

test("rejects malformed periods", () => {
  for (const period of ["2026-13", "26-10", "2026/10", "2026-1", ""]) {
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          draft.period = period;
        }),
      ),
    ).toBeNull();
  }
});

test("rejects invalid battle counts", () => {
  for (const battles of [-1, 1.5, "1000", null]) {
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          draft.battles = battles;
        }),
      ),
    ).toBeNull();
  }
});

test("rejects non-ISO generatedAt stamps", () => {
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        draft.generatedAt = "not a date";
      }),
    ),
  ).toBeNull();
});

test("rejects invalid sources", () => {
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        (draft.source as Record<string, unknown>).id = "pikalytics";
      }),
    ),
  ).toBeNull();
  for (const field of ["label", "url", "formatId"]) {
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          (draft.source as Record<string, unknown>)[field] = " ";
        }),
      ),
    ).toBeNull();
  }
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        (draft.source as Record<string, unknown>).ratingCutoff = -1;
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        delete (draft.source as Record<string, unknown>).ratingCutoff;
      }),
    ),
  ).toBeNull();
});

test("rejects invalid pokemon lists", () => {
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        draft.pokemon = "nope";
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        draft.pokemon = [];
      }),
    ),
  ).not.toBeNull();
});

test("skips invalid pokemon entries with a warning", () => {
  const species = parseMetagameSnapshot(
    snapshotVariant((draft) => {
      firstPokemon(draft).species = " ";
    }),
  );
  expect(species).not.toBeNull();
  expect(species?.pokemon).toHaveLength(5);
  expect(species?.pokemon.map((pokemon) => pokemon.rank)).toEqual([
    2, 3, 4, 5, 6,
  ]);
  for (const rank of [0, -1, 1.5, "1", null]) {
    const parsed = parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).rank = rank;
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.pokemon).toHaveLength(5);
  }
  for (const usage of [-0.1, 1.5, "high", Number.NaN]) {
    const parsed = parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).usage = usage;
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.pokemon).toHaveLength(5);
  }
  const nullUsage = parseMetagameSnapshot(
    snapshotVariant((draft) => {
      firstPokemon(draft).usage = null;
    }),
  );
  expect(nullUsage).not.toBeNull();
  expect(nullUsage?.pokemon).toHaveLength(6);
});

test("drops invalid share entries and skips pokemon with non-array lists", () => {
  for (const list of [
    "abilities",
    "items",
    "moves",
    "natures",
    "teammates",
  ] as const) {
    const skipped = parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft)[list] = "nope";
      }),
    );
    expect(skipped).not.toBeNull();
    expect(skipped?.pokemon).toHaveLength(5);
    for (const bad of [
      [{ name: "Focus Sash", share: 1.5 }],
      [{ name: " ", share: 0.5 }],
      [{ name: "Focus Sash" }],
    ]) {
      const parsed = parseMetagameSnapshot(
        snapshotVariant((draft) => {
          firstPokemon(draft)[list] = bad;
        }),
      );
      expect(parsed).not.toBeNull();
      expect(parsed?.pokemon).toHaveLength(6);
      expect(parsed?.pokemon[0]?.[list]).toEqual([]);
    }
  }
});

test("drops invalid spread entries and skips pokemon with non-array spreads", () => {
  const skipped = parseMetagameSnapshot(
    snapshotVariant((draft) => {
      firstPokemon(draft).spreads = "nope";
    }),
  );
  expect(skipped).not.toBeNull();
  expect(skipped?.pokemon).toHaveLength(5);
  for (const bad of [
    { nature: " ", statPoints: {}, share: 1 },
    {
      nature: "Jolly",
      statPoints: { hp: 33, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      share: 1,
    },
    {
      nature: "Jolly",
      statPoints: { hp: 1.5, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      share: 1,
    },
    {
      nature: "Jolly",
      statPoints: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      share: 1,
    },
    {
      nature: "Jolly",
      statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      share: 2,
    },
  ]) {
    const parsed = parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).spreads = [bad];
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.pokemon).toHaveLength(6);
    expect(parsed?.pokemon[0]?.spreads).toEqual([]);
  }
});

test("rejects ranks that are not strictly ascending", () => {
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        const pokemon = draft.pokemon as Record<string, unknown>[];
        const first = pokemon[0];
        const second = pokemon[1];
        if (!first || !second) throw new Error("fixture too small");
        [pokemon[0], pokemon[1]] = [second, first];
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        const second = (draft.pokemon as Record<string, unknown>[])[1];
        if (!second) throw new Error("fixture too small");
        second.rank = 1;
      }),
    ),
  ).toBeNull();
});

test("accepts a valid index", () => {
  expect(parseMetagameIndex(indexFixture)).toEqual(indexFixture);
});

test("accepts an index with extra properties and partial latest", () => {
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        draft.extra = "tolerated";
        draft.latest = { doubles: indexFixture.latest.doubles };
      }),
    ),
  ).not.toBeNull();
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        draft.latest = {};
      }),
    ),
  ).not.toBeNull();
});

function indexSnapshot(
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const snapshots = draft.snapshots as Record<string, unknown>[];
  if (!snapshots[0]) throw new Error("fixture has no snapshots");
  return snapshots[0];
}

test("rejects invalid indexes", () => {
  expect(parseMetagameIndex(null)).toBeNull();
  expect(parseMetagameIndex("nope")).toBeNull();
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        draft.latest = "nope";
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        draft.latest = { doubles: " " };
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        draft.snapshots = "nope";
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        indexSnapshot(draft).format = "triples";
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        indexSnapshot(draft).period = "2026-13";
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        indexSnapshot(draft).regulation = "";
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameIndex(
      indexVariant((draft) => {
        indexSnapshot(draft).path = " ";
      }),
    ),
  ).toBeNull();
});
