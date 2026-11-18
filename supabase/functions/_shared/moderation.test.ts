import { describe, expect, it } from "vitest";

import {
  ABUSE_MATCH_REASON,
  AUTOMATIC_SCREENING_REASON,
  QUARANTINE_RETENTION_MS,
  SCREEN_RESULT_MAX_BYTES,
  buildModerationNotification,
  buildModerationRecord,
  decideScreening,
  isBlockedWarmupStatus,
  parseModerationResponse,
  screenResultFor,
  selectOrphanPaths,
  selectPurgeableQuarantine,
} from "./moderation";

describe("parseModerationResponse", () => {
  it("accepts a clean omni-moderation response", () => {
    const parsed = parseModerationResponse({
      id: "modr-123",
      model: "omni-moderation-latest",
      results: [
        {
          flagged: false,
          categories: { sexual: false, violence: false },
          category_scores: { sexual: 0.0001, violence: 0.0002 },
        },
      ],
    });
    expect(parsed).toEqual({
      ok: true,
      outcome: {
        flagged: false,
        categories: { sexual: false, violence: false },
        categoryScores: { sexual: 0.0001, violence: 0.0002 },
      },
    });
  });

  it("reads flagged true and the flagged categories", () => {
    const parsed = parseModerationResponse({
      results: [
        {
          flagged: true,
          categories: { "sexual/minors": true, violence: false },
          category_scores: { "sexual/minors": 0.9, violence: 0.01 },
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.outcome.flagged).toBe(true);
      expect(parsed.outcome.categories["sexual/minors"]).toBe(true);
      expect(parsed.outcome.categories.violence).toBe(false);
    }
  });

  it("merges several results: any flag wins, scores take the max", () => {
    const parsed = parseModerationResponse({
      results: [
        { flagged: false, categories: { spam: true } },
        {
          flagged: true,
          categories: { spam: false, hate: true },
          category_scores: { hate: 0.4 },
        },
        { flagged: false, category_scores: { hate: 0.7, spam: 0.2 } },
      ],
    });
    expect(parsed).toEqual({
      ok: true,
      outcome: {
        flagged: true,
        categories: { spam: true, hate: true },
        categoryScores: { hate: 0.7, spam: 0.2 },
      },
    });
  });

  it("accepts results without categories or scores", () => {
    const parsed = parseModerationResponse({ results: [{ flagged: false }] });
    expect(parsed).toEqual({
      ok: true,
      outcome: { flagged: false, categories: {}, categoryScores: {} },
    });
  });

  it("rejects a body that is not an object", () => {
    expect(parseModerationResponse(null).ok).toBe(false);
    expect(parseModerationResponse("ok").ok).toBe(false);
    expect(parseModerationResponse([1]).ok).toBe(false);
  });

  it("rejects a response without usable results", () => {
    expect(parseModerationResponse({}).ok).toBe(false);
    expect(parseModerationResponse({ results: [] }).ok).toBe(false);
    expect(parseModerationResponse({ results: "no" }).ok).toBe(false);
  });

  it("rejects malformed entries", () => {
    expect(parseModerationResponse({ results: ["nope"] }).ok).toBe(false);
    expect(parseModerationResponse({ results: [{}] }).ok).toBe(false);
    expect(parseModerationResponse({ results: [{ flagged: "yes" }] }).ok).toBe(
      false,
    );
    expect(
      parseModerationResponse({ results: [{ flagged: true, categories: 1 }] })
        .ok,
    ).toBe(false);
    expect(
      parseModerationResponse({
        results: [{ flagged: true, categories: { spam: 1 } }],
      }).ok,
    ).toBe(false);
    expect(
      parseModerationResponse({
        results: [{ flagged: true, category_scores: { spam: "high" } }],
      }).ok,
    ).toBe(false);
  });

  it("describes what was wrong", () => {
    const parsed = parseModerationResponse({ results: [{}] });
    expect(!parsed.ok && parsed.error).toContain("flagged");
  });
});

describe("screenResultFor", () => {
  it("keeps the outcome in full when it fits the column cap", () => {
    const result = screenResultFor({
      flagged: false,
      categories: { violence: false },
      categoryScores: { violence: 0.001 },
    });
    expect(result).toEqual({
      flagged: false,
      categories: { violence: false },
      category_scores: { violence: 0.001 },
    });
  });

  it("drops category_scores first when the result is too large", () => {
    // The key appears twice (categories + category_scores), so this
    // overflows the cap only while the scores are still attached.
    const bigKey = "c".repeat(Math.floor(SCREEN_RESULT_MAX_BYTES / 2));
    const result = screenResultFor({
      flagged: true,
      categories: { [bigKey]: false },
      categoryScores: { [bigKey]: 0.5 },
    });
    expect(result).toEqual({ flagged: true, categories: { [bigKey]: false } });
  });

  it("drops categories too, keeping flagged, when even that is too large", () => {
    const result = screenResultFor({
      flagged: true,
      categories: { ["c".repeat(SCREEN_RESULT_MAX_BYTES + 1)]: false },
      categoryScores: {},
    });
    expect(result).toEqual({ flagged: true });
  });
});

describe("decideScreening", () => {
  it("rejects a flagged image", () => {
    expect(
      decideScreening({ flagged: true, categories: {}, categoryScores: {} }),
    ).toBe("rejected");
  });

  it("approves a clean image", () => {
    expect(
      decideScreening({ flagged: false, categories: {}, categoryScores: {} }),
    ).toBe("approved");
  });
});

describe("isBlockedWarmupStatus", () => {
  it("treats 451 as a known-abuse match", () => {
    expect(isBlockedWarmupStatus(451)).toBe(true);
  });

  it("treats everything else as not a match", () => {
    expect(isBlockedWarmupStatus(200)).toBe(false);
    expect(isBlockedWarmupStatus(404)).toBe(false);
    expect(isBlockedWarmupStatus(503)).toBe(false);
    expect(isBlockedWarmupStatus(0)).toBe(false);
  });
});

describe("buildModerationRecord", () => {
  it("records a post removal carrying the image paths", () => {
    expect(
      buildModerationRecord({
        postId: "post-1",
        authorId: "author-1",
        mediaPaths: ["u1/p1/i1.webp"],
        reason: AUTOMATIC_SCREENING_REASON,
      }),
    ).toEqual({
      target_type: "post",
      target_id: "post-1",
      target_user_id: "author-1",
      action: "remove",
      reason: "Automatic image screening",
      content_kind: "post",
      media_paths: ["u1/p1/i1.webp"],
    });
  });

  it("uses the abuse-match reason for a 451", () => {
    const record = buildModerationRecord({
      postId: "post-1",
      authorId: "author-1",
      mediaPaths: ["u1/p1/i1.webp", "u1/p1/i1.webp"],
      reason: ABUSE_MATCH_REASON,
    });
    expect(record.reason).toBe("Matched known abuse material");
  });
});

describe("buildModerationNotification", () => {
  it("notifies the recipient about the action, with no human actor", () => {
    expect(
      buildModerationNotification({
        recipientId: "author-1",
        postId: "post-1",
        actionId: "action-1",
      }),
    ).toEqual({
      recipient_id: "author-1",
      actor_id: null,
      type: "moderation",
      post_id: "post-1",
      moderation_action_id: "action-1",
    });
  });
});

describe("selectOrphanPaths", () => {
  const known = new Set(["u1/p1/live.webp"]);
  const listed = new Set(["u2/p2/blocked.webp"]);

  it("deletes files with no row and no moderation record", () => {
    expect(
      selectOrphanPaths(["u9/p9/gone.webp", "u1/p1/live.webp"], known, listed),
    ).toEqual(["u9/p9/gone.webp"]);
  });

  it("keeps files a moderation record still lists", () => {
    expect(selectOrphanPaths(["u2/p2/blocked.webp"], known, listed)).toEqual(
      [],
    );
  });
});

describe("selectPurgeableQuarantine", () => {
  const now = Date.parse("2027-11-19T03:17:00Z");
  const listed = new Set(["u1/p1/evidence.webp"]);
  const thirteenMonthsAgo = now - 13 * 31 * 24 * 60 * 60 * 1000;

  it("deletes old files no moderation record lists", () => {
    expect(
      selectPurgeableQuarantine(
        [{ path: "u9/p9/orphan.webp", lastModifiedMs: thirteenMonthsAgo }],
        listed,
        now,
      ),
    ).toEqual(["u9/p9/orphan.webp"]);
  });

  it("keeps files a moderation record still lists", () => {
    expect(
      selectPurgeableQuarantine(
        [{ path: "u1/p1/evidence.webp", lastModifiedMs: thirteenMonthsAgo }],
        listed,
        now,
      ),
    ).toEqual([]);
  });

  it("keeps files younger than the retention period", () => {
    expect(
      selectPurgeableQuarantine(
        [
          {
            path: "u9/p9/fresh.webp",
            lastModifiedMs: now - QUARANTINE_RETENTION_MS / 2,
          },
        ],
        listed,
        now,
      ),
    ).toEqual([]);
  });

  it("keeps files with an unknown age", () => {
    expect(
      selectPurgeableQuarantine(
        [{ path: "u9/p9/unknown.webp", lastModifiedMs: Number.NaN }],
        listed,
        now,
      ),
    ).toEqual([]);
  });

  it("honours a custom retention period", () => {
    expect(
      selectPurgeableQuarantine(
        [{ path: "u9/p9/old.webp", lastModifiedMs: now - 1000 }],
        listed,
        now,
        500,
      ),
    ).toEqual(["u9/p9/old.webp"]);
  });
});
