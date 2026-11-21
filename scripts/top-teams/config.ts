// Tuning of the top-teams ingest: what to fetch and what to keep. The
// weekly workflow and the ingest script both read this file.

/** Base URL of the public Limitless API (no key needed for these routes). */
export const API_BASE = "https://play.limitlesstcg.com/api";

/** The game Limitless files Pokémon Champions tournaments under. */
export const GAME = "VGC";

/** The Champions regulations to ingest, oldest to newest. */
export const CHAMPIONS_FORMATS = ["M-A", "M-B", "M-C"] as const;

/** Keep events from the last 60 days. */
export const WINDOW_DAYS = 60;

/** Keep events with at least this many players. */
export const MIN_PLAYERS = 32;

/** Keep placings 1 through this number. */
export const TOP_PLACINGS = 8;

/** Tournaments per list request. */
export const PAGE_SIZE = 50;

/** Minimum gap between requests, however fast the API would allow. */
export const REQUEST_SPACING_MS = 1000;

/**
 * Stop and wait when the RateLimit header says this few requests or
 * fewer remain in the window (the API allows 50 per 5 minutes).
 */
export const REMAINING_MARGIN = 2;

/** The public tournament page a team's sourceUrl points at. */
export const SOURCE_URL_BASE = "https://play.limitlesstcg.com/tournaments";
