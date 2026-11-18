import { StatusBar, Style } from "@capacitor/status-bar";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyStatusBarTheme,
  themeFromDocument,
  watchStatusBarTheme,
} from "@/lib/native/status-bar";

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: { setStyle: vi.fn() },
  Style: { Dark: "DARK", Light: "LIGHT" },
}));

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.clearAllMocks();
  document.documentElement.className = "";
});

describe("applyStatusBarTheme", () => {
  it("uses light status-bar icons for the dark theme", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };

    await applyStatusBarTheme("dark");

    expect(StatusBar.setStyle).toHaveBeenCalledOnce();
    expect(vi.mocked(StatusBar.setStyle).mock.calls[0]?.[0]).toEqual({
      style: Style.Dark,
    });
  });

  it("uses dark status-bar icons for the light theme", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };

    await applyStatusBarTheme("light");

    expect(vi.mocked(StatusBar.setStyle).mock.calls[0]?.[0]).toEqual({
      style: Style.Light,
    });
  });

  it("does nothing on the web", async () => {
    await applyStatusBarTheme("dark");
    expect(StatusBar.setStyle).not.toHaveBeenCalled();
  });
});

describe("themeFromDocument", () => {
  it("reads the theme from the dark class on the document element", () => {
    document.documentElement.classList.add("dark");
    expect(themeFromDocument(document)).toBe("dark");

    document.documentElement.classList.remove("dark");
    expect(themeFromDocument(document)).toBe("light");
  });
});

describe("watchStatusBarTheme", () => {
  it("applies the style now and again whenever the theme changes", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    document.documentElement.classList.add("dark");

    const dispose = watchStatusBarTheme(document);
    try {
      await vi.waitFor(() => expect(StatusBar.setStyle).toHaveBeenCalledOnce());

      // The user toggles the theme at runtime.
      document.documentElement.classList.remove("dark");
      await vi.waitFor(() =>
        expect(StatusBar.setStyle).toHaveBeenCalledTimes(2),
      );
      expect(vi.mocked(StatusBar.setStyle).mock.calls[1]?.[0]).toEqual({
        style: Style.Light,
      });
    } finally {
      dispose();
    }
  });

  it("stops syncing once disposed", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };

    const dispose = watchStatusBarTheme(document);
    // The initial sync runs; a disposed watcher must not react afterwards.
    await vi.waitFor(() => expect(StatusBar.setStyle).toHaveBeenCalledOnce());
    dispose();

    document.documentElement.classList.add("dark");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(StatusBar.setStyle).toHaveBeenCalledOnce();
  });
});
