/**
 * Link-preview crawler detection.
 *
 * A request gets a preview card only when its User-Agent matches one of
 * these crawlers. Everything else — every human browser — is passed through
 * to the origin unchanged.
 *
 * The match is a case-insensitive substring test on the lowercased
 * User-Agent, so variants are caught without an exact list:
 * "Slackbot-Link/1.0" contains "slackbot", "Twitterbot/1.0" contains
 * "twitterbot", "Discordbot/2.0; +https://..." contains "discordbot", and
 * so on.
 */

/** Lowercase substrings that identify a link-preview crawler. */
export const CRAWLER_USER_AGENTS: readonly string[] = [
  "discordbot",
  "twitterbot",
  "facebookexternalhit",
  // Also matches "Slackbot-Link".
  "slackbot",
  "linkedinbot",
  "redditbot",
  "telegrambot",
  "whatsapp",
  "pinterestbot",
  "applebot",
  "bingbot",
  "googlebot",
];

/**
 * Whether the User-Agent belongs to a link-preview crawler. A missing or
 * empty User-Agent is never treated as a crawler: it gets the real page,
 * like any other client.
 */
export function isCrawlerUserAgent(
  userAgent: string | null | undefined,
): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some((crawler) => ua.includes(crawler));
}
