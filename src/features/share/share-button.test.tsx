import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { ShareButton } from "@/features/share/share-button";

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

function renderButton(url = "https://ohkolab.com/post/1") {
  render(
    <Providers>
      <ShareButton title="A post" url={url} />
    </Providers>,
  );
}

describe("ShareButton", () => {
  afterEach(() => {
    stubShare(undefined as unknown as () => Promise<void>);
    stubClipboard(undefined as unknown as (text: string) => Promise<void>);
  });

  it("opens the native sheet when the platform has one", async () => {
    const user = userEvent.setup();
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    stubShare(share);
    stubClipboard(writeText);
    renderButton();

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(share).toHaveBeenCalledWith({
      title: "A post",
      text: undefined,
      url: "https://ohkolab.com/post/1",
    });
    expect(writeText).not.toHaveBeenCalled();
    // The sheet speaks for itself: no toast.
    expect(
      screen.queryByText("Link copied to clipboard."),
    ).not.toBeInTheDocument();
  });

  it("copies the link with a toast when there is no native sheet", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);
    renderButton();

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(writeText).toHaveBeenCalledWith("https://ohkolab.com/post/1");
    expect(
      await screen.findByText("Link copied to clipboard."),
    ).toBeInTheDocument();
  });

  it("shows an error toast when the copy fails", async () => {
    const user = userEvent.setup();
    stubClipboard(() => Promise.reject(new Error("denied")));
    renderButton();

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(
      await screen.findByText("The link could not be copied."),
    ).toBeInTheDocument();
  });
});
