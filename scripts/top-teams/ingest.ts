// Ingests recent Pokémon Champions tournament teams from the public
// Limitless API into public/data/top-teams/teams.json. Run from the repo root:
//   node scripts/top-teams/ingest.ts
//
// For each Champions regulation (M-A, M-B, M-C) it pages the tournament list
// (newest first), keeps events from the last 60 days with >= 32 players,
// fetches each qualifying event's standings once, keeps placings 1-8 with a
// six-Pokémon team sheet, resolves every set against the Pokémon data and
// DROPS (never fudges) whatever does not resolve. Player names and countries
// are read for nothing and never stored.
//
// All-or-nothing: the file is written once at the end, so any failure —
// including a 429 — leaves the committed snapshot untouched and exits
// non-zero.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { API_BASE, CHAMPIONS_FORMATS, GAME, PAGE_SIZE } from "./config.ts";
import { createPacedFetch } from "./fetch.ts";
import { createSheetResolver } from "./names.ts";
import {
  buildSnapshot,
  buildTeam,
  countDrops,
  pageIsBeforeWindow,
  qualifies,
  windowCutoff,
} from "./transform.ts";
import type {
  BuildTeamResult,
  LimitlessStanding,
  LimitlessTournament,
  TopTeam,
} from "./types.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const snapshotPath = join(
  repoRoot,
  "public",
  "data",
  "top-teams",
  "teams.json",
);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const client = createPacedFetch({
  fetchFn: fetch,
  now: () => Date.now(),
  sleep,
});

function tournamentsUrl(format: string, page: number): string {
  const params = new URLSearchParams({
    game: GAME,
    format,
    limit: String(PAGE_SIZE),
    page: String(page),
  });
  return `${API_BASE}/tournaments?${params.toString()}`;
}

function standingsUrl(tournamentId: string): string {
  return `${API_BASE}/tournaments/${tournamentId}/standings`;
}

async function fetchRecentTournaments(
  format: string,
  cutoff: Date,
): Promise<LimitlessTournament[]> {
  const kept: LimitlessTournament[] = [];
  const seen = new Set<string>();
  for (let page = 1; ; page++) {
    const list = (await client.getJson(tournamentsUrl(format, page))) as
      LimitlessTournament[] | undefined;
    if (!Array.isArray(list) || list.length === 0) break;
    for (const tournament of list) {
      if (!seen.has(tournament.id) && qualifies(tournament, cutoff)) {
        seen.add(tournament.id);
        kept.push(tournament);
      }
    }
    if (pageIsBeforeWindow(list, cutoff)) break;
  }
  return kept;
}

async function main(): Promise<void> {
  const now = new Date();
  const cutoff = windowCutoff(now);
  const resolver = createSheetResolver();

  console.log(
    `Ingesting Limitless top teams since ${cutoff.toISOString().slice(0, 10)}...`,
  );

  const teams: TopTeam[] = [];
  const allResults: BuildTeamResult[] = [];
  let eventsKept = 0;

  for (const format of CHAMPIONS_FORMATS) {
    const tournaments = await fetchRecentTournaments(format, cutoff);
    const eligible = tournaments.filter((t) => t.format === format);
    console.log(`  ${format}: ${eligible.length} qualifying event(s)`);
    for (const tournament of eligible) {
      const standings = (await client.getJson(standingsUrl(tournament.id))) as
        LimitlessStanding[] | undefined;
      if (!Array.isArray(standings)) {
        throw new Error(
          `Standings for ${tournament.id} are not a list; the API contract changed`,
        );
      }
      const results = standings.map((standing) =>
        buildTeam(tournament, standing, resolver),
      );
      allResults.push(...results);
      const keptTeams = results
        .filter(
          (r): r is Extract<BuildTeamResult, { status: "kept" }> =>
            r.status === "kept",
        )
        .map((r) => r.team);
      teams.push(...keptTeams);
      eventsKept += keptTeams.length > 0 ? 1 : 0;
      console.log(
        `    ${tournament.name} (${tournament.date.slice(0, 10)}, ${tournament.players} players): kept ${keptTeams.length} team(s)`,
      );
    }
  }

  const { skipped, drops } = countDrops(allResults);
  const snapshot = buildSnapshot(teams, now.toISOString());

  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`  wrote ${snapshotPath}`);

  console.log(
    `Done: ${eventsKept} event(s) with teams, ${teams.length} team(s) kept, ${skipped} standings row(s) outside the top 8, ${[...drops.values()].reduce((a, b) => a + b, 0)} dropped.`,
  );
  for (const [reason, count] of [...drops.entries()].sort()) {
    console.log(`    dropped ${count}x: ${reason}`);
  }
  if (teams.length === 0) {
    console.log(
      "No teams in the window. The empty snapshot is committed as-is; check the API if this is unexpected.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
