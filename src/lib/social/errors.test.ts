import { describe, expect, it } from "vitest";

import {
  describeSocialError,
  isMissingRelationError,
  socialFail,
  socialFailure,
  socialSucceed,
} from "@/lib/social/errors";

describe("socialFailure", () => {
  it("uses the default message for a code", () => {
    expect(socialFailure("rate_limited")).toEqual({
      code: "rate_limited",
      message: "You are posting too quickly. Wait a few minutes and try again.",
    });
  });

  it("accepts a custom message", () => {
    expect(socialFailure("invalid_input", "Bad input")).toEqual({
      code: "invalid_input",
      message: "Bad input",
    });
  });
});

describe("socialFail and socialSucceed", () => {
  it("builds a failing result", () => {
    expect(socialFail("not_found")).toEqual({
      ok: false,
      error: { code: "not_found", message: "That is no longer available." },
    });
  });

  it("builds a succeeding result with data", () => {
    expect(socialSucceed(42)).toEqual({ ok: true, data: 42 });
  });

  it("builds a succeeding result without data", () => {
    expect(socialSucceed()).toEqual({ ok: true, data: undefined });
  });
});

describe("isMissingRelationError", () => {
  it("recognises missing table, function and schema error codes", () => {
    expect(
      isMissingRelationError({ code: "42P01", message: "relation missing" }),
    ).toBe(true);
    expect(
      isMissingRelationError({ code: "42883", message: "function missing" }),
    ).toBe(true);
    expect(
      isMissingRelationError({ code: "PGRST202", message: "schema missing" }),
    ).toBe(true);
    expect(
      isMissingRelationError({ code: "PGRST205", message: "table missing" }),
    ).toBe(true);
  });

  it("rejects other errors and non-objects", () => {
    expect(
      isMissingRelationError({ code: "P0A01", message: "rate limited" }),
    ).toBe(false);
    expect(isMissingRelationError({ message: "no code" })).toBe(false);
    expect(isMissingRelationError("42P01")).toBe(false);
    expect(isMissingRelationError(null)).toBe(false);
  });
});

describe("describeSocialError", () => {
  it("maps the social rate limit error codes", () => {
    expect(
      describeSocialError({ code: "P0A01", message: "too many posts" }).code,
    ).toBe("rate_limited");
    expect(
      describeSocialError({ code: "P0A02", message: "too many comments" }).code,
    ).toBe("rate_limited");
  });

  it("maps the suspension error code", () => {
    expect(
      describeSocialError({ code: "P0A03", message: "suspended" }).code,
    ).toBe("suspended");
  });

  it("maps a length check violation to too_long", () => {
    const error = {
      code: "23514",
      message: 'new row violates check constraint "posts_body_length"',
    };
    expect(describeSocialError(error).code).toBe("too_long");
  });

  it("maps another check violation to invalid_input", () => {
    const error = {
      code: "23514",
      message: 'new row violates check constraint "follows_no_self"',
    };
    expect(describeSocialError(error).code).toBe("invalid_input");
  });

  it("maps PostgREST and Postgres error codes", () => {
    expect(
      describeSocialError({ code: "22001", message: "too long" }).code,
    ).toBe("too_long");
    expect(
      describeSocialError({ code: "42501", message: "forbidden" }).code,
    ).toBe("forbidden");
    expect(
      describeSocialError({ code: "PGRST116", message: "no rows" }).code,
    ).toBe("not_found");
    expect(describeSocialError({ code: "PGRST301", message: "jwt" }).code).toBe(
      "not_signed_in",
    );
  });

  it("maps HTTP statuses", () => {
    expect(
      describeSocialError({ status: 401, message: "unauthorized" }).code,
    ).toBe("not_signed_in");
    expect(describeSocialError({ status: 404, message: "gone" }).code).toBe(
      "not_found",
    );
    expect(
      describeSocialError({ status: 429, message: "slow down" }).code,
    ).toBe("rate_limited");
  });

  it("maps network failures", () => {
    expect(describeSocialError(new TypeError("Failed to fetch")).code).toBe(
      "network",
    );
    expect(
      describeSocialError({ message: "NetworkError: connection lost" }).code,
    ).toBe("network");
    expect(
      describeSocialError({ message: "Network request failed" }).code,
    ).toBe("network");
  });

  it("falls back to unknown", () => {
    expect(
      describeSocialError({ code: "XX000", message: "whatever" }).code,
    ).toBe("unknown");
    expect(describeSocialError("boom").code).toBe("unknown");
    expect(describeSocialError(null).code).toBe("unknown");
  });

  it("always returns a user-facing message", () => {
    expect(
      describeSocialError({ code: "P0A03", message: "suspended" }).message,
    ).toBe("This account cannot post right now.");
  });
});
