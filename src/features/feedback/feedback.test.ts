import { describe, expect, it } from "vitest";

import type { FeedbackRow } from "@/lib/database.types";
import {
  isFeedbackKind,
  normalizeFeedbackMessage,
  validateFeedbackMessage,
  useSendFeedback,
  useSetFeedbackStatus,
} from "@/features/feedback/feedback";
import {
  createFakeClient,
  expectFailed,
  runMutation,
} from "@/lib/social/test-client";

function feedbackRow(
  partial: Partial<FeedbackRow> & { id: string },
): FeedbackRow {
  return {
    user_id: "user-1",
    kind: "bug",
    message: "The calc broke",
    context: null,
    status: "new",
    created_at: "2026-11-17T10:00:00.000Z",
    handled_by: null,
    handled_at: null,
    ...partial,
  };
}

describe("feedback validation", () => {
  it("trims the message", () => {
    expect(normalizeFeedbackMessage("  hi there  ")).toBe("hi there");
  });

  it("rejects messages that are too short", () => {
    expect(validateFeedbackMessage("short")).toBe(
      "Tell us a bit more (at least 10 characters).",
    );
  });

  it("rejects messages that are too long", () => {
    expect(validateFeedbackMessage("a".repeat(2001))).toBe(
      "Feedback is limited to 2000 characters.",
    );
  });

  it("accepts valid messages", () => {
    expect(validateFeedbackMessage("This is a valid message")).toBeNull();
  });

  it("recognizes the feedback kinds", () => {
    expect(isFeedbackKind("bug")).toBe(true);
    expect(isFeedbackKind("idea")).toBe(true);
    expect(isFeedbackKind("other")).toBe(true);
    expect(isFeedbackKind("complaint")).toBe(false);
  });
});

describe("useSendFeedback", () => {
  it("inserts the feedback with the granted columns", async () => {
    const fake = createFakeClient();
    const result = await runMutation(() => useSendFeedback(fake.client), {
      kind: "bug",
      message: "The calc broke",
      context: { page: "/calc" },
    });
    expect(result?.ok).toBe(true);
    expect(fake.records).toHaveLength(1);
    const record = fake.records[0];
    expect(record?.table).toBe("feedback");
    expect(record?.insertValues).toEqual([
      {
        user_id: "user-1",
        kind: "bug",
        message: "The calc broke",
        context: { page: "/calc" },
      },
    ]);
  });

  it("fails with invalid_input for a short message", async () => {
    const fake = createFakeClient();
    const result = await runMutation(() => useSendFeedback(fake.client), {
      kind: "bug",
      message: "short",
      context: null,
    });
    expectFailed(result, "invalid_input");
    expect(fake.records).toHaveLength(0);
  });

  it("maps the rate-limit code to rate_limited", async () => {
    const fake = createFakeClient({
      resolve: () => ({ data: null, error: { code: "P0A06" } }),
    });
    const result = await runMutation(() => useSendFeedback(fake.client), {
      kind: "idea",
      message: "Please add more stats",
      context: null,
    });
    expectFailed(result, "rate_limited");
  });
});

describe("useSetFeedbackStatus", () => {
  it("calls set_feedback_status with the id and status", async () => {
    const fake = createFakeClient();
    const result = await runMutation(() => useSetFeedbackStatus(fake.client), {
      feedbackId: "fb-1",
      status: "seen",
    } as const);
    expect(result?.ok).toBe(true);
    expect(fake.rpcCalls).toEqual([
      {
        fn: "set_feedback_status",
        args: { feedback_id: "fb-1", new_status: "seen" },
      },
    ]);
  });

  it("rejects setting the status back to new", async () => {
    const fake = createFakeClient();
    const result = await runMutation(() => useSetFeedbackStatus(fake.client), {
      feedbackId: "fb-1",
      status: "new",
    } as const);
    expectFailed(result, "invalid_input");
    expect(fake.rpcCalls).toHaveLength(0);
  });
});

describe("feedbackRow factory sanity", () => {
  it("builds a row with defaults", () => {
    const row = feedbackRow({ id: "fb-1" });
    expect(row.status).toBe("new");
    expect(row.kind).toBe("bug");
  });
});
