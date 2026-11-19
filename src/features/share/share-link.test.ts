import { afterEach, describe, expect, it, vi } from "vitest";

import { shareKindForUrl, shareLink } from "@/features/share/share-link";
import { track } from "@/lib/telemetry/analytics";

vi.mock("@/lib/telemetry/analytics", () => ({
  track: vi.fn(),
}));

const TARGET = { title: "My team", url: "https://ohkolab.com/teams/1" };

function stubShare(impl?: () => Promise<void>) {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: impl,
  });
}

function stubClipboard(impl?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: impl },
  });
}

describe("shareKindForUrl", () => {
  it("maps each shared route to its kind", () => {
    expect(shareKindForUrl("https://ohkolab.com/calc?c=v1.abc")).toBe("calc");
    expect(shareKindForUrl("https://ohkolab.com/teams/1")).toBe("team");
    expect(shareKindForUrl("https://ohkolab.com/u/ash")).toBe("profile");
    expect(shareKindForUrl("https://ohkolab.com/posts/9")).toBe("post");
    expect(shareKindForUrl("https://ohkolab.com/g/slug")).toBe("group");
  });

  it("stays null for anything else", () => {
    expect(shareKindForUrl("https://ohkolab.com/")).toBeNull();
    expect(shareKindForUrl("https://example.com/x")).toBeNull();
  });
});

describe("shareLink", () => {
  afterEach(() => {
    stubShare(undefined as unknown as () => Promise<void>);
    stubClipboard(undefined as unknown as (text: string) => Promise<void>);
  });

  it("uses the native sheet when it exists", async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    stubShare(share);
    stubClipboard(writeText);

    await expect(shareLink(TARGET)).resolves.toBe("shared");

    expect(share).toHaveBeenCalledWith({
      title: "My team",
      text: undefined,
      url: "https://ohkolab.com/teams/1",
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies to the clipboard when there is no native sheet", async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);

    await expect(shareLink(TARGET)).resolves.toBe("copied");

    expect(writeText).toHaveBeenCalledWith("https://ohkolab.com/teams/1");
  });

  it("treats a dismissed sheet as done, without copying", async () => {
    const share = vi.fn(() =>
      Promise.reject(new DOMException("Aborted", "AbortError")),
    );
    const writeText = vi.fn(async () => {});
    stubShare(share);
    stubClipboard(writeText);

    await expect(shareLink(TARGET)).resolves.toBe("shared");

    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the sheet fails", async () => {
    stubShare(() => Promise.reject(new Error("no handler")));
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);

    await expect(shareLink(TARGET)).resolves.toBe("copied");

    expect(writeText).toHaveBeenCalledWith("https://ohkolab.com/teams/1");
  });

  it("reports failure when even the clipboard fails", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));

    await expect(shareLink(TARGET)).resolves.toBe("failed");
  });

  it("tracks what was shared, without the link", async () => {
    vi.mocked(track).mockClear();
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);

    await shareLink(TARGET);

    expect(track).toHaveBeenCalledWith("link_shared", { kind: "team" });
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain(
      "ohkolab.com/teams/1",
    );
  });

  it("tracks a native share the same way", async () => {
    vi.mocked(track).mockClear();
    stubShare(async () => {});
    stubClipboard(vi.fn(async () => {}));

    await shareLink({ title: "Calc", url: "https://ohkolab.com/calc?c=v1.x" });

    expect(track).toHaveBeenCalledWith("link_shared", { kind: "calc" });
  });

  it("tracks nothing for an unknown route, and nothing on failure", async () => {
    vi.mocked(track).mockClear();
    stubClipboard(() => Promise.reject(new Error("denied")));

    await shareLink({ title: "Home", url: "https://ohkolab.com/" });
    await shareLink(TARGET);

    expect(track).not.toHaveBeenCalled();
  });
});
