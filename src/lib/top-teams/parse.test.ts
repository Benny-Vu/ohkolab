import { describe, expect, it, vi } from "vitest";

import { parseTopTeamsFile } from "@/lib/top-teams/parse";
import type { TopTeam, TopTeamsFile } from "@/lib/top-teams/types";

/** One valid team, trimmed to the fields that matter per test. */
function validTeam(overrides: Partial<TopTeam> = {}): TopTeam {
  return {
    eventId: "abc123",
    event: "Talon's FIGHT CLUB #111",
    date: "2026-11-20",
    format: "M-C",
    players: 88,
    placing: 1,
    record: { wins: 7, losses: 0, ties: 0 },
    sourceUrl: "https://play.limitlesstcg.com/tournaments/abc123",
    members: Array.from({ length: 6 }, () => ({
      species: "Garchomp",
      item: "Life Orb",
      ability: "Rough Skin",
      nature: "Adamant",
      tera: "Dragon",
      moves: ["Earthquake", "Dragon Claw"],
    })) as TopTeam["members"],
    ...overrides,
  };
}

function validFile(teams: TopTeam[]): TopTeamsFile {
  return {
    generatedAt: "2026-11-21T06:00:00.000Z",
    source: "limitless",
    teams,
  };
}

describe("parseTopTeamsFile", () => {
  it("accepts a valid file", () => {
    const file = validFile([validTeam()]);
    expect(parseTopTeamsFile(file)).toEqual(file);
  });

  it("rejects files that are not the limitless snapshot", () => {
    expect(parseTopTeamsFile(null)).toBeNull();
    expect(parseTopTeamsFile({ ...validFile([]), source: "other" })).toBeNull();
    expect(
      parseTopTeamsFile({ ...validFile([]), generatedAt: "nope" }),
    ).toBeNull();
  });

  it("drops invalid teams and keeps the rest", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const parsed = parseTopTeamsFile(
        validFile([
          validTeam(),
          // An event below the 32-player bar must not be in the snapshot.
          validTeam({ players: 12, placing: 3 }),
          // A placing outside the top 8 must not be either.
          validTeam({ placing: 9 }),
          // Five members is not a team.
          validTeam({
            members: validTeam().members.slice(0, 5),
          }),
        ]),
      );
      expect(parsed?.teams).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(3);
    } finally {
      warn.mockRestore();
    }
  });

  it("rejects members with unknown tera types or empty move lists", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const members = validTeam().members as unknown as {
        species: string;
        item: string;
        ability: string;
        nature: string;
        tera: string | null;
        moves: string[];
      }[];
      const badTera = structuredClone(members);
      badTera[0]!.tera = "Not a type";
      const noMoves = structuredClone(members);
      noMoves[1]!.moves = [];
      expect(
        parseTopTeamsFile(
          validFile([validTeam({ members: badTera as TopTeam["members"] })]),
        )?.teams,
      ).toHaveLength(0);
      expect(
        parseTopTeamsFile(
          validFile([validTeam({ members: noMoves as TopTeam["members"] })]),
        )?.teams,
      ).toHaveLength(0);
    } finally {
      warn.mockRestore();
    }
  });

  it("requires the source URL to be the tournament page", () => {
    expect(
      parseTopTeamsFile(
        validFile([
          validTeam({ sourceUrl: "https://example.com/tournaments/abc123" }),
        ]),
      )?.teams,
    ).toHaveLength(0);
  });
});
