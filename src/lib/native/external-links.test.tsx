import { Browser } from "@capacitor/browser";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isExternalUrl,
  openInSystemBrowser,
  setupExternalLinkInterceptor,
} from "@/lib/native/external-links";

vi.mock("@capacitor/browser", () => ({
  Browser: { open: vi.fn() },
}));

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

const ORIGIN = "https://localhost";

function anchor(href: string): HTMLAnchorElement {
  const body = document.body;
  body.innerHTML = `<a href="${href}">link</a>`;
  return body.querySelector("a")!;
}

afterEach(() => {
  delete globalWithBridge.Capacitor;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("isExternalUrl", () => {
  it("flags absolute http(s) URLs away from the app's origin", () => {
    expect(isExternalUrl("https://sentry.io/privacy/", ORIGIN)).toBe(true);
    expect(isExternalUrl("http://example.com/", ORIGIN)).toBe(true);
  });

  it("keeps same-origin, relative and non-http URLs internal", () => {
    expect(isExternalUrl(`${ORIGIN}/terms`, ORIGIN)).toBe(false);
    expect(isExternalUrl("/terms", ORIGIN)).toBe(false);
    expect(isExternalUrl("mailto:hello@example.com", ORIGIN)).toBe(false);
    expect(isExternalUrl("javascript:alert(1)", ORIGIN)).toBe(false);
    expect(isExternalUrl("not a url", ORIGIN)).toBe(false);
  });
});

describe("openInSystemBrowser", () => {
  it("opens the URL in the system browser on the native app", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };

    await openInSystemBrowser("https://sentry.io/privacy/");

    expect(Browser.open).toHaveBeenCalledOnce();
    expect(vi.mocked(Browser.open).mock.calls[0]?.[0]).toEqual({
      url: "https://sentry.io/privacy/",
    });
  });

  it("does nothing on the web", async () => {
    await expect(
      openInSystemBrowser("https://sentry.io/privacy/"),
    ).resolves.toBe(false);
    expect(Browser.open).not.toHaveBeenCalled();
  });
});

describe("setupExternalLinkInterceptor", () => {
  it("intercepts clicks on external links and opens them outside the WebView", () => {
    const open = vi.fn().mockReturnValue(true);
    const dispose = setupExternalLinkInterceptor(document, ORIGIN, open);
    try {
      const link = anchor("https://sentry.io/privacy/");
      fireEvent.click(link);

      expect(open).toHaveBeenCalledOnce();
      expect(open).toHaveBeenCalledWith("https://sentry.io/privacy/");
    } finally {
      dispose();
    }
  });

  it("leaves internal router links untouched", () => {
    const open = vi.fn().mockReturnValue(true);
    const dispose = setupExternalLinkInterceptor(document, ORIGIN, open);
    try {
      const link = anchor("/terms");
      fireEvent.click(link);

      expect(open).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it("leaves same-origin and non-http links untouched", () => {
    const open = vi.fn().mockReturnValue(true);
    const dispose = setupExternalLinkInterceptor(document, ORIGIN, open);
    try {
      fireEvent.click(anchor(`${ORIGIN}/teams`));
      fireEvent.click(anchor("mailto:hello@example.com"));
      expect(open).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it("passes modified clicks through", () => {
    const open = vi.fn().mockReturnValue(true);
    const dispose = setupExternalLinkInterceptor(document, ORIGIN, open);
    try {
      fireEvent.click(anchor("https://sentry.io/privacy/"), {
        ctrlKey: true,
      });
      expect(open).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it("stops intercepting once disposed", () => {
    const open = vi.fn().mockReturnValue(true);
    const dispose = setupExternalLinkInterceptor(document, ORIGIN, open);
    dispose();

    fireEvent.click(anchor("https://sentry.io/privacy/"));
    expect(open).not.toHaveBeenCalled();
  });

  it("works against the rendered footer link markup", () => {
    const open = vi.fn().mockReturnValue(true);
    const dispose = setupExternalLinkInterceptor(document, ORIGIN, open);
    try {
      render(
        <a href="https://github.com/vu-forge" rel="noreferrer" target="_blank">
          Vu Forge
        </a>,
      );
      fireEvent.click(screen.getByRole("link"));

      expect(open).toHaveBeenCalledWith("https://github.com/vu-forge");
    } finally {
      dispose();
    }
  });
});
