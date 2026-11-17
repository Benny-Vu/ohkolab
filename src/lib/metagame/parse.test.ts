import { expect, test } from "vitest";
import { indexFixture, snapshotFixture } from "@/lib/metagame/fixture";
import {
  parseMetagameIndex,
  parseMetagameSnapshot,
} from "@/lib/metagame/parse";

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

test("rejects invalid pokemon entries", () => {
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).species = " ";
      }),
    ),
  ).toBeNull();
  for (const rank of [0, -1, 1.5, "1", null]) {
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          firstPokemon(draft).rank = rank;
        }),
      ),
    ).toBeNull();
  }
  for (const usage of [-0.1, 1.5, "high", Number.NaN]) {
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          firstPokemon(draft).usage = usage;
        }),
      ),
    ).toBeNull();
  }
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).usage = null;
      }),
    ),
  ).not.toBeNull();
});

test("rejects invalid share lists", () => {
  for (const list of ["abilities", "items", "moves", "natures", "teammates"]) {
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          firstPokemon(draft)[list] = "nope";
        }),
      ),
    ).toBeNull();
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          firstPokemon(draft)[list] = [{ name: "Focus Sash", share: 1.5 }];
        }),
      ),
    ).toBeNull();
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          firstPokemon(draft)[list] = [{ name: " ", share: 0.5 }];
        }),
      ),
    ).toBeNull();
    expect(
      parseMetagameSnapshot(
        snapshotVariant((draft) => {
          firstPokemon(draft)[list] = [{ name: "Focus Sash" }];
        }),
      ),
    ).toBeNull();
  }
});

test("rejects invalid spreads", () => {
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).spreads = "nope";
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).spreads = [
          { nature: " ", statPoints: {}, share: 1 },
        ];
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).spreads = [
          {
            nature: "Jolly",
            statPoints: { hp: 33, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            share: 1,
          },
        ];
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).spreads = [
          {
            nature: "Jolly",
            statPoints: { hp: 1.5, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            share: 1,
          },
        ];
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).spreads = [
          {
            nature: "Jolly",
            statPoints: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            share: 1,
          },
        ];
      }),
    ),
  ).toBeNull();
  expect(
    parseMetagameSnapshot(
      snapshotVariant((draft) => {
        firstPokemon(draft).spreads = [
          {
            nature: "Jolly",
            statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            share: 2,
          },
        ];
      }),
    ),
  ).toBeNull();
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
