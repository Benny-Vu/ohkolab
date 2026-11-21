/**
 * The top-teams data contract: the trimmed tournament snapshot committed
 * under `public/data/top-teams/` and the shape the /meta Top teams view
 * renders. Everything here is what Limitless publishes in its public
 * standings, minus what OHKOLab deliberately does not show or store:
 * no player names, no countries (our rule: discovery features never
 * surface minors, and the source page — linked from every team — has the
 * names anyway).
 */

/** One Pokémon of a published team, as the open team sheet shows it. */
export interface TopTeamMember {
  /** The app's species name, resolved and validated against `@/data`. */
  species: string;
  /** The held item's app name; Mega Stones appear here, as items. */
  item: string | null;
  /** The ability's app name. */
  ability: string;
  /** The published nature. The sheet has no Stat Points. */
  nature: string;
  /** The Tera type as published, or null when the sheet has none. */
  tera: string | null;
  /** One to four move names, app names. */
  moves: readonly string[];
}

/** A placing player's team from one event. */
export interface TopTeam {
  /** The Limitless tournament id, for the source URL. */
  eventId: string;
  /** The event's name as published. */
  event: string;
  /** The event's date, ISO (YYYY-MM-DD). */
  date: string;
  /** The Champions regulation (M-A, M-B, M-C). */
  format: string;
  /** How many players the event had (the snapshot only keeps ≥ 32). */
  players: number;
  /** The placing, 1 through 8. */
  placing: number;
  /** The published record. */
  record: { wins: number; losses: number; ties: number };
  /** The Limitless tournament page, where the names live. */
  sourceUrl: string;
  /** The six validated members. */
  members: readonly TopTeamMember[];
}

/** The whole committed snapshot file. */
export interface TopTeamsFile {
  /** When the ingest script wrote the file, ISO. */
  generatedAt: string;
  /** Where the data comes from; the UI attributes it. */
  source: "limitless";
  /** Newest event first, per the ingest contract. */
  teams: readonly TopTeam[];
}
