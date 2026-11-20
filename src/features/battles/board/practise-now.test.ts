import { describe, expect, it } from "vitest";

import {
  buildPractiseRequest,
  PRACTISE_WINDOW_MS,
} from "@/features/battles/board/practise-now";

/**
 * The one-tap request builder: the payload the confirm step posts, and
 * above all the one-hour window it opens around the caller's clock.
 */

const NOW = new Date("2026-11-22T12:00:00Z");

describe("buildPractiseRequest", () => {
  it("opens a window that starts now and ends exactly one hour later", () => {
    const payload = buildPractiseRequest({
      now: NOW,
      format: "doubles",
      language: "en",
      timezone: "Europe/Oslo",
      rules: "Casual · now",
    });
    expect(payload.starts_at).toBe("2026-11-22T12:00:00.000Z");
    expect(payload.ends_at).toBe("2026-11-22T13:00:00.000Z");
    expect(PRACTISE_WINDOW_MS).toBe(60 * 60 * 1000);
  });

  it("carries the caller's format, language, time zone and rules", () => {
    const payload = buildPractiseRequest({
      now: NOW,
      format: "singles",
      language: "ja",
      timezone: "Asia/Tokyo",
      rules: "カジュアル · 今すぐ",
    });
    expect(payload).toEqual({
      format: "singles",
      rules: "カジュアル · 今すぐ",
      note: null,
      starts_at: "2026-11-22T12:00:00.000Z",
      ends_at: "2026-11-22T13:00:00.000Z",
      timezone: "Asia/Tokyo",
      language: "ja",
      team_id: null,
    });
  });
});
