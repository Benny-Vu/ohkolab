import type { BattleFormat } from "@/types/battle";
import type { NewBattleRequest } from "@/lib/battles/mutations";

/**
 * The one-tap "Practise now" request: everything the create form would
 * collect, pre-filled for "find me a game in the next hour". Pure and
 * unit-tested; the button component supplies the caller's clock, format,
 * locale and time zone.
 */

/** How long a practise request stays open: one hour from now. */
export const PRACTISE_WINDOW_MS = 60 * 60 * 1000;

/** What the one-tap request posts, computed from the caller's context. */
export function buildPractiseRequest(input: {
  now: Date;
  format: BattleFormat;
  language: "en" | "ja";
  timezone: string;
  /** The rules line, localized ("Casual · now"). */
  rules: string;
}): NewBattleRequest {
  return {
    format: input.format,
    rules: input.rules,
    note: null,
    starts_at: input.now.toISOString(),
    ends_at: new Date(input.now.getTime() + PRACTISE_WINDOW_MS).toISOString(),
    timezone: input.timezone,
    language: input.language,
    team_id: null,
  };
}
