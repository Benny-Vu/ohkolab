import { describe, expect, it } from "vitest";

import { formatUnreadBadge } from "@/lib/notifications/badge";

describe("formatUnreadBadge", () => {
  it("is empty at zero", () => {
    expect(formatUnreadBadge(0)).toBe("");
  });

  it("is empty for negative counts", () => {
    expect(formatUnreadBadge(-1)).toBe("");
  });

  it("shows the count up to 99", () => {
    expect(formatUnreadBadge(1)).toBe("1");
    expect(formatUnreadBadge(5)).toBe("5");
    expect(formatUnreadBadge(99)).toBe("99");
  });

  it("caps at 99+", () => {
    expect(formatUnreadBadge(100)).toBe("99+");
    expect(formatUnreadBadge(1000)).toBe("99+");
  });
});
