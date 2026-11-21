import { describe, expect, it } from "vitest";

import {
  applyBattleFilter,
  formatBattleTime,
  isLiveOpenRequest,
  NO_BATTLE_FILTER,
  summarizeBattleReplies,
  summarizeBattleRequests,
  type BattleRequestLite,
} from "@/lib/battles/logic";
import type { BattleRequestRow } from "@/lib/database.types";

/** A full request row with the given overrides. */
function requestRow(partial: Partial<BattleRequestRow>): BattleRequestLite {
  return {
    id: "r1",
    author_id: "author-1",
    format: "doubles",
    rules: "Reg M-C, best of 3",
    note: null,
    starts_at: null,
    ends_at: null,
    timezone: null,
    language: "en",
    team_id: null,
    status: "open",
    accepted_reply_id: null,
    played_at: null,
    created_at: "2026-11-22T10:00:00Z",
    updated_at: "2026-11-22T10:00:00Z",
    ...partial,
  };
}

const NOW = new Date("2026-11-22T12:00:00Z");

describe("isLiveOpenRequest", () => {
  it("keeps open requests without a window", () => {
    expect(isLiveOpenRequest(requestRow({}), NOW)).toBe(true);
  });

  it("keeps requests whose window has not ended", () => {
    expect(
      isLiveOpenRequest(requestRow({ ends_at: "2026-11-22T14:00:00Z" }), NOW),
    ).toBe(true);
  });

  it("drops matched, closed, expired and past-window requests", () => {
    expect(isLiveOpenRequest(requestRow({ status: "matched" }), NOW)).toBe(
      false,
    );
    expect(isLiveOpenRequest(requestRow({ status: "closed" }), NOW)).toBe(
      false,
    );
    expect(isLiveOpenRequest(requestRow({ status: "expired" }), NOW)).toBe(
      false,
    );
    expect(
      isLiveOpenRequest(requestRow({ ends_at: "2026-11-22T11:00:00Z" }), NOW),
    ).toBe(false);
  });
});

describe("applyBattleFilter", () => {
  const singles = requestRow({
    id: "s",
    format: "singles",
    created_at: "2026-11-22T10:00:00Z",
  });
  const doubles = requestRow({
    id: "d",
    format: "doubles",
    created_at: "2026-11-22T10:30:00Z",
  });
  const japanese = requestRow({
    id: "j",
    language: "ja",
    created_at: "2026-11-22T10:45:00Z",
  });
  const matched = requestRow({ id: "m", status: "matched" });

  it("shows every live-open request, newest first", () => {
    const visible = applyBattleFilter(
      [matched, singles, doubles, japanese],
      NO_BATTLE_FILTER,
      NOW,
    );
    expect(visible.map((request) => request.id)).toEqual(["j", "d", "s"]);
  });

  it("narrows by format and language", () => {
    expect(
      applyBattleFilter(
        [singles, doubles],
        { ...NO_BATTLE_FILTER, format: "singles" },
        NOW,
      ).map((request) => request.id),
    ).toEqual(["s"]);
    expect(
      applyBattleFilter(
        [japanese, singles],
        { ...NO_BATTLE_FILTER, language: "ja" },
        NOW,
      ).map((request) => request.id),
    ).toEqual(["j"]);
  });
});

describe("formatBattleTime", () => {
  it("formats an instant in the given zone and locale", () => {
    // 12:30 UTC is 13:30 in Oslo (CET, UTC+1) in late November.
    const text = formatBattleTime(
      "2026-11-22T12:30:00Z",
      "Europe/Oslo",
      "en-GB",
    );
    expect(text).toContain("13:30");
    // The same instant in Tokyo is 21:30 (JST, UTC+9).
    expect(
      formatBattleTime("2026-11-22T12:30:00Z", "Asia/Tokyo", "ja-JP"),
    ).toContain("21:30");
  });

  it("returns null for null and unparseable instants", () => {
    expect(formatBattleTime(null, "Europe/Oslo", "en-GB")).toBeNull();
    expect(formatBattleTime("not a time", "Europe/Oslo", "en-GB")).toBeNull();
  });

  it("falls back to the viewer's zone on an unknown zone hint", () => {
    // The fallback equals formatting without any zone: the viewer's own
    // clock, whatever the test machine's time zone is.
    expect(
      formatBattleTime("2026-11-22T12:30:00Z", "Mars/Olympus", "en-GB"),
    ).toBe(formatBattleTime("2026-11-22T12:30:00Z", undefined, "en-GB"));
  });
});

describe("summarizeBattleRequests", () => {
  it("joins authors and teams by id, null when missing", () => {
    const request = requestRow({ author_id: "a1", team_id: "t1" });
    const summary = summarizeBattleRequests(
      [request],
      [
        {
          id: "a1",
          username: "rika",
          display_name: "Rika",
          avatar_species: "Garchomp",
        },
      ],
      [
        {
          id: "t1",
          name: "Rain team",
          format: "doubles",
          data: [],
          game_team_id: null,
        },
      ],
    )[0];
    expect(summary?.author?.username).toBe("rika");
    expect(summary?.team?.name).toBe("Rain team");

    const orphan = summarizeBattleRequests(
      [requestRow({ author_id: "gone", team_id: null })],
      [],
      [],
    )[0];
    expect(orphan?.author).toBeNull();
    expect(orphan?.team).toBeNull();
  });
});

describe("summarizeBattleReplies", () => {
  it("joins responders by id", () => {
    const summary = summarizeBattleReplies(
      [
        {
          id: "reply-1",
          request_id: "r1",
          responder_id: "a2",
          status: "pending",
          created_at: "2026-11-22T12:00:00Z",
        },
      ],
      [
        {
          id: "a2",
          username: "kenta",
          display_name: null,
          avatar_species: null,
        },
      ],
    )[0];
    expect(summary?.responder?.username).toBe("kenta");
    expect(summary?.reply.status).toBe("pending");
  });
});
