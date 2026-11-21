// Pure functions that turn Limitless API responses into the committed
// top-teams snapshot. Everything here is deterministic and side-effect free
// (the resolver is injected), so the fixture tests cover it without
// network access or calc.

import {
  MIN_PLAYERS,
  SOURCE_URL_BASE,
  TOP_PLACINGS,
  WINDOW_DAYS,
} from "./config.ts";
import type {
  BuildTeamResult,
  DropReason,
  LimitlessSheetMember,
  LimitlessStanding,
  LimitlessTournament,
  SheetResolver,
  TopTeam,
  TopTeamMember,
  TopTeamsFile,
} from "./types.ts";

/** The oldest event date the window keeps, for the given "now". */
export function windowCutoff(now: Date): Date {
  return new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/** True when the event happened within the window (inclusive). */
export function isWithinWindow(
  tournament: LimitlessTournament,
  cutoff: Date,
): boolean {
  const date = Date.parse(tournament.date);
  return !Number.isNaN(date) && date >= cutoff.getTime();
}

/** True when the event is big enough to keep (≥ 32 players). */
export function hasEnoughPlayers(tournament: LimitlessTournament): boolean {
  return (
    typeof tournament.players === "number" &&
    Number.isInteger(tournament.players) &&
    tournament.players >= MIN_PLAYERS
  );
}

/** True when the event belongs in the snapshot. */
export function qualifies(
  tournament: LimitlessTournament,
  cutoff: Date,
): boolean {
  return isWithinWindow(tournament, cutoff) && hasEnoughPlayers(tournament);
}

/**
 * True when every event on the page is older than the window: the list is
 * newest-first, so paging can stop there.
 */
export function pageIsBeforeWindow(
  page: readonly LimitlessTournament[],
  cutoff: Date,
): boolean {
  return page.length > 0 && page.every((t) => !isWithinWindow(t, cutoff));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function resolveMembers(
  decklist: readonly LimitlessSheetMember[],
  resolver: SheetResolver,
): { members: TopTeamMember[] } | { reason: DropReason; detail: string } {
  const members: TopTeamMember[] = [];
  for (const sheet of decklist) {
    const resolved = resolver.resolve(sheet);
    if ("field" in resolved) {
      return {
        reason: resolved.field,
        detail: `${sheet.name ?? sheet.id}: ${resolved.field} ${resolved.value}`,
      };
    }
    members.push(resolved);
  }
  return { members };
}

/**
 * What the transform did with one standings row. Placings outside the top 8
 * (and drops, whose placing is null) are "skipped" — expected, not counted
 * as data problems; a top-8 row that cannot be represented is "dropped"
 * with the reason, and never fudged.
 */
export function buildTeam(
  tournament: LimitlessTournament,
  standing: LimitlessStanding,
  resolver: SheetResolver,
): BuildTeamResult {
  const placing = standing.placing;
  if (!isCount(placing) || placing < 1 || placing > TOP_PLACINGS) {
    return { status: "skipped" };
  }
  if (!Array.isArray(standing.decklist)) {
    return {
      status: "dropped",
      reason: "no-decklist",
      detail: `placing ${placing} has no team sheet`,
    };
  }
  if (standing.decklist.length !== 6) {
    return {
      status: "dropped",
      reason: "short-decklist",
      detail: `placing ${placing} lists ${standing.decklist.length} Pokémon`,
    };
  }
  const record = standing.record;
  if (
    !record ||
    !isCount(record.wins) ||
    !isCount(record.losses) ||
    !isCount(record.ties)
  ) {
    return {
      status: "dropped",
      reason: "no-record",
      detail: `placing ${placing} has no record`,
    };
  }
  const resolved = resolveMembers(standing.decklist, resolver);
  if ("reason" in resolved) {
    return {
      status: "dropped",
      reason: resolved.reason,
      detail: resolved.detail,
    };
  }

  return {
    status: "kept",
    team: {
      eventId: tournament.id,
      event: tournament.name,
      date: tournament.date.slice(0, 10),
      format: tournament.format,
      players: tournament.players,
      placing,
      record: {
        wins: record.wins,
        losses: record.losses,
        ties: record.ties,
      },
      sourceUrl: `${SOURCE_URL_BASE}/${tournament.id}`,
      members: resolved.members,
    },
  };
}

/** Newest event first, then best placing — the file's committed order. */
export function sortTeams(teams: readonly TopTeam[]): TopTeam[] {
  return [...teams].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.placing - b.placing ||
      a.eventId.localeCompare(b.eventId),
  );
}

/** The whole committed snapshot from the kept teams. */
export function buildSnapshot(
  teams: readonly TopTeam[],
  generatedAt: string,
): TopTeamsFile {
  return { generatedAt, source: "limitless", teams: sortTeams(teams) };
}

/** Reason -> how many teams were dropped for it, for the run summary. */
export function countDrops(results: readonly BuildTeamResult[]): {
  skipped: number;
  drops: Map<DropReason, number>;
} {
  let skipped = 0;
  const drops = new Map<DropReason, number>();
  for (const result of results) {
    if (result.status === "skipped") {
      skipped += 1;
    } else if (result.status === "dropped") {
      drops.set(result.reason, (drops.get(result.reason) ?? 0) + 1);
    }
  }
  return { skipped, drops };
}
