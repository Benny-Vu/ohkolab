import { afterEach, describe, expect, it, vi } from "vitest";

import { shareLink } from "@/features/share/share-link";

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
});
