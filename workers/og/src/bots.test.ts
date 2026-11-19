import { describe, expect, it } from "vitest";

import { CRAWLER_USER_AGENTS, isCrawlerUserAgent } from "./bots";

/** One real User-Agent per crawler on the list. */
const CRAWLER_SAMPLES: readonly [string, string][] = [
  [
    "discordbot",
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
  ],
  ["twitterbot", "Twitterbot/1.0"],
  [
    "facebookexternalhit",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  ],
  ["slackbot", "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)"],
  ["slackbot", "Slackbot/1.0 (+https://api.slack.com/robots)"],
  ["linkedinbot", "LinkedInBot/1.0 (compatible; LinkedInApp/1.0)"],
  ["redditbot", "redditbot/1.0 (by /u/reddit)"],
  ["telegrambot", "TelegramBot (like TwitterBot)"],
  ["whatsapp", "WhatsApp/2.23.20.0"],
  ["pinterestbot", "Pinterestbot/1.0 (+http://www.pinterest.com/bot.html)"],
  [
    "applebot",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Applebot/0.1; +http://www.apple.com/go/applebot)",
  ],
  [
    "bingbot",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  ],
  [
    "googlebot",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  ],
];

describe("isCrawlerUserAgent", () => {
  it.each(CRAWLER_SAMPLES)(
    "matches %s by substring, whatever the rest of the UA says",
    (_crawler, userAgent) => {
      expect(isCrawlerUserAgent(userAgent)).toBe(true);
    },
  );

  it("matches every UA on the crawler list inside a realistic browser UA", () => {
    const chrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36";
    for (const crawler of CRAWLER_USER_AGENTS) {
      expect(isCrawlerUserAgent(`${crawler}/1.0 ${chrome}`)).toBe(true);
    }
  });

  it("matches variants and casing", () => {
    expect(isCrawlerUserAgent("DISCORDBOT/2.0")).toBe(true);
    expect(
      isCrawlerUserAgent("DiscordBot (webhook; +https://discord.com)"),
    ).toBe(true);
    expect(isCrawlerUserAgent("TWITTERBOT/1.0")).toBe(true);
    expect(isCrawlerUserAgent("Slackbot-Link/1.0")).toBe(true);
    expect(isCrawlerUserAgent("FacebookExternalHit/1.1")).toBe(true);
    expect(isCrawlerUserAgent("GoogleBot")).toBe(true);
  });

  it("does not match normal browsers", () => {
    expect(
      isCrawlerUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
    expect(
      isCrawlerUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
    expect(
      isCrawlerUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
      ),
    ).toBe(false);
    expect(isCrawlerUserAgent("curl/8.4.0")).toBe(false);
    expect(
      isCrawlerUserAgent("ohkolab-capacitor/1.0 Android com.ohkolab.app"),
    ).toBe(false);
  });

  it("does not match other bots that are not link-preview crawlers", () => {
    expect(isCrawlerUserAgent("Mozilla/5.0 (compatible; YandexBot/3.0)")).toBe(
      false,
    );
    expect(isCrawlerUserAgent("DuckDuckBot/1.0")).toBe(false);
  });

  it("never treats a missing or empty User-Agent as a crawler", () => {
    expect(isCrawlerUserAgent(null)).toBe(false);
    expect(isCrawlerUserAgent(undefined)).toBe(false);
    expect(isCrawlerUserAgent("")).toBe(false);
  });
});
