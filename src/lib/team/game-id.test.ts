import { describe, expect, it } from "vitest";

import { isValidGameTeamId, sanitizeGameTeamId } from "@/lib/team/game-id";

describe("isValidGameTeamId", () => {
  it("accepts 10 letters and digits, case kept", () => {
    expect(isValidGameTeamId("AbCd123456")).toBe(true);
    expect(isValidGameTeamId("aaaaaaaaaa")).toBe(true);
    expect(isValidGameTeamId("0123456789")).toBe(true);
  });

  it("rejects other shapes", () => {
    expect(isValidGameTeamId("AbCd12345")).toBe(false); // 9 chars
    expect(isValidGameTeamId("AbCd1234567")).toBe(false); // 11 chars
    expect(isValidGameTeamId("AbCd12345 ")).toBe(false); // trailing space
    expect(isValidGameTeamId("AbCd1234-6")).toBe(false); // punctuation
    expect(isValidGameTeamId("")).toBe(false);
  });
});

describe("sanitizeGameTeamId", () => {
  it("trims surrounding spaces from a valid ID", () => {
    expect(sanitizeGameTeamId("  AbCd123456 \n")).toBe("AbCd123456");
  });

  it("gives an empty string for anything invalid or empty", () => {
    expect(sanitizeGameTeamId("too short")).toBe("");
    expect(sanitizeGameTeamId("")).toBe("");
    expect(sanitizeGameTeamId(null)).toBe("");
    expect(sanitizeGameTeamId(undefined)).toBe("");
  });
});
