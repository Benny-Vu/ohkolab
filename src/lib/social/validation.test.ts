import { describe, expect, it } from "vitest";

import type { Json } from "@/lib/database.types";
import {
  ATTACHMENT_MAX_BYTES,
  COMMENT_BODY_MAX,
  POST_BODY_MAX,
  REPORT_DETAILS_MAX,
  SUSPENSION_REASON_MAX,
  measureAttachmentBytes,
  normalizeCommentBody,
  normalizePostBody,
  normalizeReportDetails,
  normalizeSuspensionReason,
  validateAttachment,
  validateCommentBody,
  validatePostBody,
  validateReportDetails,
  validateReportReason,
  validateReportTarget,
  validateSuspensionReason,
  validateSuspensionUntil,
} from "@/lib/social/validation";

describe("validatePostBody", () => {
  it("accepts a normal body", () => {
    expect(validatePostBody("Hello world")).toBeNull();
  });

  it("accepts the maximum length", () => {
    expect(validatePostBody("x".repeat(POST_BODY_MAX))).toBeNull();
  });

  it("rejects an empty body", () => {
    expect(validatePostBody("")).toBe("Write something before posting.");
  });

  it("rejects a body over the limit", () => {
    expect(validatePostBody("x".repeat(POST_BODY_MAX + 1))).toBe(
      `Posts are limited to ${POST_BODY_MAX} characters.`,
    );
  });

  it("normalizePostBody trims surrounding whitespace", () => {
    expect(normalizePostBody("  hi  ")).toBe("hi");
  });
});

describe("validateCommentBody", () => {
  it("accepts a normal body", () => {
    expect(validateCommentBody("Nice team")).toBeNull();
  });

  it("accepts the maximum length", () => {
    expect(validateCommentBody("x".repeat(COMMENT_BODY_MAX))).toBeNull();
  });

  it("rejects an empty body", () => {
    expect(validateCommentBody("")).toBe("Write something before commenting.");
  });

  it("rejects a body over the limit", () => {
    expect(validateCommentBody("x".repeat(COMMENT_BODY_MAX + 1))).toBe(
      `Comments are limited to ${COMMENT_BODY_MAX} characters.`,
    );
  });

  it("normalizeCommentBody trims surrounding whitespace", () => {
    expect(normalizeCommentBody("  hi  ")).toBe("hi");
  });
});

describe("report details", () => {
  it("normalizes an empty string to null", () => {
    expect(normalizeReportDetails("   ")).toBeNull();
  });

  it("normalizes a trimmed value", () => {
    expect(normalizeReportDetails("  spam bot  ")).toBe("spam bot");
  });

  it("accepts the maximum length", () => {
    expect(validateReportDetails("x".repeat(REPORT_DETAILS_MAX))).toBeNull();
  });

  it("rejects details over the limit", () => {
    expect(validateReportDetails("x".repeat(REPORT_DETAILS_MAX + 1))).toBe(
      `Details are limited to ${REPORT_DETAILS_MAX} characters.`,
    );
  });
});

describe("validateReportTarget", () => {
  it("accepts a known target type with an id", () => {
    expect(validateReportTarget({ type: "post", id: "post-1" })).toBeNull();
    expect(validateReportTarget({ type: "comment", id: "c1" })).toBeNull();
    expect(validateReportTarget({ type: "profile", id: "user-1" })).toBeNull();
  });

  it("rejects an unknown target type", () => {
    expect(validateReportTarget({ type: "team", id: "t1" })).toBe(
      "Choose what you are reporting.",
    );
  });

  it("rejects an empty target id", () => {
    expect(validateReportTarget({ type: "post", id: "" })).toBe(
      "The reported item could not be identified.",
    );
  });
});

describe("validateReportReason", () => {
  it("accepts a known reason", () => {
    expect(validateReportReason("spam")).toBeNull();
    expect(validateReportReason("harassment")).toBeNull();
    expect(validateReportReason("inappropriate")).toBeNull();
    expect(validateReportReason("other")).toBeNull();
  });

  it("rejects an unknown reason", () => {
    expect(validateReportReason("cheating")).toBe(
      "Choose a reason for the report.",
    );
  });
});

describe("validateSuspensionReason", () => {
  it("accepts a normal reason", () => {
    expect(validateSuspensionReason("Repeated spam")).toBeNull();
  });

  it("accepts the maximum length", () => {
    expect(
      validateSuspensionReason("x".repeat(SUSPENSION_REASON_MAX)),
    ).toBeNull();
  });

  it("rejects an empty reason", () => {
    expect(validateSuspensionReason("")).toBe(
      "Write a reason for the suspension.",
    );
  });

  it("rejects a reason over the limit", () => {
    expect(
      validateSuspensionReason("x".repeat(SUSPENSION_REASON_MAX + 1)),
    ).toBe(`Reasons are limited to ${SUSPENSION_REASON_MAX} characters.`);
  });

  it("normalizeSuspensionReason trims surrounding whitespace", () => {
    expect(normalizeSuspensionReason("  spam  ")).toBe("spam");
  });
});

describe("validateSuspensionUntil", () => {
  it("accepts a future date", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(validateSuspensionUntil(future)).toBeNull();
  });

  it("rejects an unparseable date", () => {
    expect(validateSuspensionUntil("not a date")).toBe(
      "Choose a valid end date.",
    );
  });

  it("rejects a date in the past", () => {
    expect(validateSuspensionUntil("2020-01-01T00:00:00.000Z")).toBe(
      "The suspension must end in the future.",
    );
  });
});

describe("validateAttachment", () => {
  it("accepts null", () => {
    expect(validateAttachment(null)).toBeNull();
  });

  it("accepts an object within the size limit", () => {
    const attachment: Json = { kind: "team", name: "Rain" };
    expect(validateAttachment(attachment)).toBeNull();
    expect(measureAttachmentBytes(attachment)).toBeLessThanOrEqual(
      ATTACHMENT_MAX_BYTES,
    );
  });

  it("rejects a non-object attachment", () => {
    expect(validateAttachment("team")).toBe(
      "Attachments must be a team or calculation snapshot.",
    );
  });

  it("rejects an attachment over the size limit", () => {
    const attachment: Json = {
      kind: "team",
      padding: "x".repeat(ATTACHMENT_MAX_BYTES),
    };
    expect(measureAttachmentBytes(attachment)).toBeGreaterThan(
      ATTACHMENT_MAX_BYTES,
    );
    expect(validateAttachment(attachment)).toBe(
      "Attachments are limited to 8 KB.",
    );
  });
});
