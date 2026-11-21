import { describe, expect, it } from "vitest";

import {
  buildSnapshot,
  buildTeam,
  countDrops,
  hasEnoughPlayers,
  isWithinWindow,
  pageIsBeforeWindow,
  qualifies,
  windowCutoff,
} from "./transform.ts";
import type {
  LimitlessSheetMember,
  LimitlessStanding,
  LimitlessTournament,
  SheetResolver,
  TopTeamMember,
} from "./types.ts";

const NOW = new Date("2026-11-21T12:00:00.000Z");
const CUTOFF = windowCutoff(NOW);

// A stub resolver: fixture tests must not depend on @smogon/calc. It
// accepts every sheet except the deliberately unknown "missingmon".
const stubResolver: SheetResolver = {
  resolve(member: LimitlessSheetMember) {
    if (member.id === "missingmon") {
      return { field: "species", value: member.id };
    }
    const resolved: TopTeamMember = {
      species: member.id,
      item: member.item ?? null,
      ability: member.ability,
      nature: member.nature,
      tera: member.tera ?? null,
      moves: (member.attacks ?? []).filter((a): a is string => Boolean(a)),
    };
    return resolved;
  },
};

function tournament(
  overrides: Partial<LimitlessTournament> = {},
): LimitlessTournament {
  return {
    id: "event1",
    name: "Talon's FIGHT CLUB #111",
    date: "2026-11-20T01:00:00.000Z",
    format: "M-C",
    players: 88,
    ...overrides,
  };
}

function sheet(
  id: string,
  overrides: Partial<LimitlessSheetMember> = {},
): LimitlessSheetMember {
  return {
    id,
    name: id,
    item: "Focus Sash",
    ability: "Prankster",
    attacks: ["Moonblast", "Tailwind", null, null],
    nature: "Modest",
    tera: null,
    ...overrides,
  };
}

function standing(
  overrides: Partial<LimitlessStanding> = {},
): LimitlessStanding {
  return {
    name: "SomePlayer",
    country: "US",
    placing: 1,
    record: { wins: 4, losses: 1, ties: 0 },
    decklist: Array.from({ length: 6 }, (_, i) => sheet(`mon${i}`)),
    ...overrides,
  };
}

describe("the event window and size filters", () => {
  it("keeps events inside the last 60 days", () => {
    expect(isWithinWindow(tournament(), CUTOFF)).toBe(true);
  });

  it("rejects events older than 60 days", () => {
    expect(
      isWithinWindow(tournament({ date: "2026-08-20T01:00:00.000Z" }), CUTOFF),
    ).toBe(false);
  });

  it("rejects unparseable dates", () => {
    expect(isWithinWindow(tournament({ date: "not-a-date" }), CUTOFF)).toBe(
      false,
    );
  });

  it("keeps events with at least 32 players", () => {
    expect(hasEnoughPlayers(tournament({ players: 32 }))).toBe(true);
    expect(hasEnoughPlayers(tournament({ players: 31 }))).toBe(false);
    expect(hasEnoughPlayers(tournament({ players: 88.5 }))).toBe(false);
  });

  it("combines both into qualifies", () => {
    expect(qualifies(tournament(), CUTOFF)).toBe(true);
    expect(qualifies(tournament({ players: 6 }), CUTOFF)).toBe(false);
    expect(
      qualifies(tournament({ date: "2026-08-01T00:00:00.000Z" }), CUTOFF),
    ).toBe(false);
  });

  it("stops paging when a whole page is older than the window", () => {
    const oldPage = [
      tournament({ id: "a", date: "2026-08-01T00:00:00.000Z" }),
      tournament({ id: "b", date: "2026-07-01T00:00:00.000Z" }),
    ];
    expect(pageIsBeforeWindow(oldPage, CUTOFF)).toBe(true);
    expect(pageIsBeforeWindow([tournament()], CUTOFF)).toBe(false);
    expect(pageIsBeforeWindow([], CUTOFF)).toBe(false);
  });
});

describe("buildTeam", () => {
  it("maps the kept team onto the contract fields", () => {
    const result = buildTeam(tournament(), standing(), stubResolver);
    expect(result.status).toBe("kept");
    if (result.status !== "kept") return;
    expect(result.team).toEqual({
      eventId: "event1",
      event: "Talon's FIGHT CLUB #111",
      date: "2026-11-20",
      format: "M-C",
      players: 88,
      placing: 1,
      record: { wins: 4, losses: 1, ties: 0 },
      sourceUrl: "https://play.limitlesstcg.com/tournaments/event1",
      members: expect.any(Array),
    });
    expect(result.team.members).toHaveLength(6);
    expect(result.team.members[0].moves).toEqual(["Moonblast", "Tailwind"]);
  });

  it("never stores the player's name or country", () => {
    const result = buildTeam(tournament(), standing(), stubResolver);
    if (result.status !== "kept") throw new Error("expected a kept team");
    const json = JSON.stringify(result.team);
    expect(json).not.toContain("SomePlayer");
    expect(json).not.toContain('"US"');
    expect(json).not.toContain("country");
  });

  it("skips placings outside the top 8 and drops", () => {
    expect(
      buildTeam(tournament(), standing({ placing: 9 }), stubResolver),
    ).toEqual({
      status: "skipped",
    });
    expect(
      buildTeam(tournament(), standing({ placing: null }), stubResolver),
    ).toEqual({ status: "skipped" });
  });

  it("drops a top-8 row without a team sheet", () => {
    const result = buildTeam(
      tournament(),
      standing({ decklist: null }),
      stubResolver,
    );
    expect(result).toEqual({
      status: "dropped",
      reason: "no-decklist",
      detail: expect.any(String),
    });
  });

  it("drops a top-8 row with a short team sheet", () => {
    const result = buildTeam(
      tournament(),
      standing({ decklist: [sheet("a"), sheet("b")] }),
      stubResolver,
    );
    expect(result).toMatchObject({
      status: "dropped",
      reason: "short-decklist",
    });
  });

  it("drops a top-8 row without a record", () => {
    const result = buildTeam(
      tournament(),
      standing({ record: null }),
      stubResolver,
    );
    expect(result).toMatchObject({ status: "dropped", reason: "no-record" });
  });

  it("drops, never fudges, a team with an unresolvable member", () => {
    const decklist = Array.from({ length: 6 }, (_, i) =>
      sheet(i === 3 ? "missingmon" : `mon${i}`),
    );
    const result = buildTeam(
      tournament(),
      standing({ decklist }),
      stubResolver,
    );
    expect(result).toMatchObject({
      status: "dropped",
      reason: "species",
    });
  });
});

describe("buildSnapshot", () => {
  it("sorts newest event first, then best placing", () => {
    const older = buildTeam(
      tournament({ id: "old", date: "2026-11-01T00:00:00.000Z" }),
      standing({ placing: 1 }),
      stubResolver,
    );
    const newer = buildTeam(
      tournament({ id: "new", date: "2026-11-20T00:00:00.000Z" }),
      standing({ placing: 2 }),
      stubResolver,
    );
    const newerWinner = buildTeam(
      tournament({ id: "new", date: "2026-11-20T00:00:00.000Z" }),
      standing({ placing: 1 }),
      stubResolver,
    );
    expect(older.status).toBe("kept");
    expect(newer.status).toBe("kept");
    expect(newerWinner.status).toBe("kept");
    if (
      older.status !== "kept" ||
      newer.status !== "kept" ||
      newerWinner.status !== "kept"
    ) {
      throw new Error("expected kept teams");
    }
    const snapshot = buildSnapshot(
      [older.team, newerWinner.team, newer.team],
      "2026-11-21T12:00:00.000Z",
    );
    expect(snapshot.generatedAt).toBe("2026-11-21T12:00:00.000Z");
    expect(snapshot.source).toBe("limitless");
    expect(snapshot.teams.map((t) => t.placing)).toEqual([1, 2, 1]);
  });
});

describe("countDrops", () => {
  it("counts skipped rows and drops by reason", () => {
    const results = [
      buildTeam(tournament(), standing({ placing: 9 }), stubResolver),
      buildTeam(tournament(), standing({ decklist: null }), stubResolver),
      buildTeam(
        tournament(),
        standing({
          decklist: Array.from({ length: 6 }, () => sheet("missingmon")),
        }),
        stubResolver,
      ),
      buildTeam(
        tournament(),
        standing({
          decklist: Array.from({ length: 6 }, () => sheet("missingmon")),
        }),
        stubResolver,
      ),
    ];
    const { skipped, drops } = countDrops(results);
    expect(skipped).toBe(1);
    expect(drops.get("no-decklist")).toBe(1);
    expect(drops.get("species")).toBe(2);
  });
});
