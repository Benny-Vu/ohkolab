// Local types for the top-teams ingest pipeline.
//
// The contract half mirrors src/lib/top-teams/types.ts field for field (the
// committed JSON must match it exactly), but the script runs under plain
// Node where the @/ alias does not resolve, so everything here is
// self-contained.

import type { CHAMPIONS_FORMATS } from "./config.ts";

// --- The output contract (mirrors src/lib/top-teams/types.ts) ---

/** One Pokémon of a published team, as the open team sheet shows it. */
export interface TopTeamMember {
  species: string;
  item: string | null;
  ability: string;
  nature: string;
  tera: string | null;
  moves: readonly string[];
}

/** A placing player's team from one event. */
export interface TopTeam {
  eventId: string;
  event: string;
  date: string;
  format: string;
  players: number;
  placing: number;
  record: { wins: number; losses: number; ties: number };
  sourceUrl: string;
  members: readonly TopTeamMember[];
}

/** The whole committed snapshot file. */
export interface TopTeamsFile {
  generatedAt: string;
  source: "limitless";
  teams: readonly TopTeam[];
}

// --- Limitless API shapes (only the fields the pipeline reads) ---

/** One entry of GET /tournaments?game=…&format=…&limit=…&page=… */
export interface LimitlessTournament {
  id: string;
  name: string;
  /** ISO datetime, e.g. "2026-11-21T01:00:00.000Z". */
  date: string;
  format: string;
  players: number;
}

/** One Pokémon of a published open team sheet. */
export interface LimitlessSheetMember {
  id: string;
  name: string;
  /** The held item's name, or null/absent when the sheet shows none. */
  item?: string | null;
  ability: string;
  /** Up to four attacks; empty slots come through as null or "". */
  attacks?: readonly (string | null)[];
  nature: string;
  /** The Tera type's name, or null when the sheet has none. */
  tera?: string | null;
}

/** One player of GET /tournaments/{id}/standings. */
export interface LimitlessStanding {
  /** The player's name — read for nothing, never stored. */
  name?: string;
  /** The player's country — read for nothing, never stored. */
  country?: string;
  /** Numeric for finishers, null for players who dropped. */
  placing: number | null;
  record?: { wins: number; losses: number; ties: number } | null;
  /** The open team sheet, when the event published one. */
  decklist?: readonly LimitlessSheetMember[] | null;
}

// --- Name resolution (scripts/top-teams/names.ts) ---

/** A team-sheet member resolved to the app's names. */
export interface ResolvedMember {
  species: string;
  item: string | null;
  ability: string;
  nature: string;
  tera: string | null;
  moves: readonly string[];
}

/** Which sheet field failed to resolve, plus what the sheet said. */
export interface ResolveFailure {
  field:
    | "species"
    | "battle-only"
    | "item"
    | "ability"
    | "nature"
    | "tera"
    | "moves"
    | "no-moves";
  value: string;
}

/**
 * Resolves one published team-sheet member against the Pokémon data
 * (@smogon/calc generation 0 plus @pkmn/dex, mirroring src/data). Battle-only
 * Mega formes fold to the base species holding its stone; anything unknown
 * fails instead of being fudged.
 */
export interface SheetResolver {
  resolve(member: LimitlessSheetMember): ResolvedMember | ResolveFailure;
}

// --- The transform (scripts/top-teams/transform.ts) ---

/** The Champions regulations the snapshot may contain. */
export type ChampionsFormat = (typeof CHAMPIONS_FORMATS)[number];

/** Why a top-8 team did not make it into the snapshot. */
export type DropReason =
  ResolveFailure["field"] | "no-decklist" | "short-decklist" | "no-record";

/** What the transform did with one standings row. */
export type BuildTeamResult =
  | { status: "kept"; team: TopTeam }
  /** Placing outside the top 8 or a drop — not an error, just not kept. */
  | { status: "skipped" }
  | { status: "dropped"; reason: DropReason; detail: string };
