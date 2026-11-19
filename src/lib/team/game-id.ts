/**
 * Champions team IDs: the 10-character, case-sensitive code the game gives
 * for a shared "Replica Team". Players paste it in the game's "Build Teams
 * using Team IDs" screen; there is no public API that turns a code back
 * into a team, so the site can only store and show it.
 *
 * The exact game-side format is not documented; treat it as "10 letters and
 * digits, case-sensitive" and validate loosely.
 */

/** A team ID as the game prints it: exactly 10 letters and digits. */
const GAME_TEAM_ID_PATTERN = /^[A-Za-z0-9]{10}$/;

/** True when the value is a well-formed team ID (no trimming). */
export function isValidGameTeamId(value: string): boolean {
  return GAME_TEAM_ID_PATTERN.test(value);
}

/**
 * Turns raw input into a team ID worth storing: trimmed, or an empty string
 * when the input is missing, not a string, or not 10 letters and digits.
 * Never throws, so it can guard anything read from storage or the database.
 */
export function sanitizeGameTeamId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  return isValidGameTeamId(trimmed) ? trimmed : "";
}
