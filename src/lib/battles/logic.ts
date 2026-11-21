/**
 * Pure battle-board logic: the shape the board renders, the filters, and
 * the time-window phrasing. No Supabase here — `queries.ts` and
 * `mutations.ts` feed these types; every function is unit-tested next door.
 */

import type { BattleFormat } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";
import type { BattleRequestRow, BattleReplyRow } from "@/lib/database.types";

/** A battle request row as the board reads it (all columns). */
export type BattleRequestLite = BattleRequestRow;

/** A reply row as the author's offer list reads it. */
export type BattleReplyLite = BattleReplyRow;

/** The author's public profile fields the cards show. */
export interface BattleAuthorLite {
  id: string;
  username: string;
  display_name: string | null;
  avatar_species: string | null;
}

/** The attached team, as much as the board cards and previews need. */
export interface BattleTeamLite {
  id: string;
  name: string;
  format: string;
  /** The team members, for the card's team preview. */
  data: PokemonSet[];
  game_team_id: string | null;
}

/** One request with its author resolved, ready for the board card. */
export interface BattleRequestSummary {
  request: BattleRequestLite;
  author: BattleAuthorLite | null;
  /** The attached public team, or null (RLS hides private ones anyway). */
  team: BattleTeamLite | null;
}

/** One reply with its responder resolved, ready for the author's list. */
export interface BattleReplySummary {
  reply: BattleReplyLite;
  responder: BattleAuthorLite | null;
}

/** The board's filters. "all" shows everything; the format mirrors the app. */
export interface BattleFilter {
  format: "all" | BattleFormat;
  language: "all" | "en" | "ja";
}

export const NO_BATTLE_FILTER: BattleFilter = {
  format: "all",
  language: "all",
};

/**
 * True while a request belongs on the board: it says it is open and its
 * time window has not passed. The hourly cron flips the status eventually;
 * this keeps the board truthful in between.
 */
export function isLiveOpenRequest(
  request: BattleRequestLite,
  now: Date,
): boolean {
  if (request.status !== "open") {
    return false;
  }
  return request.ends_at === null || new Date(request.ends_at) > now;
}

/** Applies the board filters to live-open requests, newest first. */
export function applyBattleFilter(
  requests: BattleRequestLite[],
  filter: BattleFilter,
  now: Date,
): BattleRequestLite[] {
  return requests
    .filter((request) => isLiveOpenRequest(request, now))
    .filter(
      (request) => filter.format === "all" || request.format === filter.format,
    )
    .filter(
      (request) =>
        filter.language === "all" || request.language === filter.language,
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

/**
 * The window as the viewer's clock sees it. The instants are UTC in the
 * database; the requester's `timezone` is only a hint for how THEY meant
 * it, so the board shows the viewer's own zone (per the brief) and this
 * helper formats an instant for a zone and locale. Returns null for a null
 * instant.
 */
export function formatBattleTime(
  instant: string | null,
  timeZone: string | undefined,
  locale: string,
): string | null {
  if (instant === null) {
    return null;
  }
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  try {
    // The board shows a day-and-time phrase; the year only when it differs.
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(date);
  } catch {
    // An unknown time zone (a bad hint) falls back to the viewer's own.
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}

/** Joins the request rows with their author profiles and attached teams. */
export function summarizeBattleRequests(
  requests: BattleRequestLite[],
  authors: BattleAuthorLite[],
  teams: BattleTeamLite[],
): BattleRequestSummary[] {
  const authorById = new Map(authors.map((author) => [author.id, author]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  return requests.map((request) => ({
    request,
    author: authorById.get(request.author_id) ?? null,
    team:
      request.team_id === null ? null : (teamById.get(request.team_id) ?? null),
  }));
}

/** Joins the reply rows with their responder profiles. */
export function summarizeBattleReplies(
  replies: BattleReplyLite[],
  responders: BattleAuthorLite[],
): BattleReplySummary[] {
  const responderById = new Map(responders.map((r) => [r.id, r]));
  return replies.map((reply) => ({
    reply,
    responder: responderById.get(reply.responder_id) ?? null,
  }));
}
