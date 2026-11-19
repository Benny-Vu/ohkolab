import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OfflineNotice } from "@/components/offline-notice";
import { setLocale } from "@/lib/i18n/locale";

type Bridge = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

/** Installs the Capacitor bridge the way the native app injects it. */
function setBridge(native: boolean): void {
  globalWithBridge.Capacitor = {
    getPlatform: () => (native ? "android" : "web"),
    isNativePlatform: () => native,
  };
}

function setNavigatorOnLine(value: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    writable: true,
    value,
  });
}

beforeEach(() => {
  setLocale("en");
  delete globalWithBridge.Capacitor;
  setNavigatorOnLine(true);
});

afterEach(() => {
  delete globalWithBridge.Capacitor;
  setNavigatorOnLine(true);
});

describe("OfflineNotice", () => {
  it("stays hidden on the web, even offline", () => {
    setBridge(false);
    setNavigatorOnLine(false);
    render(<OfflineNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays hidden in the app while online", () => {
    setBridge(true);
    render(<OfflineNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("appears when the app goes offline and disappears when back online", () => {
    setBridge(true);
    render(<OfflineNotice />);
    expect(screen.queryByRole("status")).toBeNull();

    act(() => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're offline. Some content may not load.",
    );

    act(() => {
      setNavigatorOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("is there from the first render when the device is already offline", () => {
    setBridge(true);
    setNavigatorOnLine(false);
    render(<OfflineNotice />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("follows the active language", () => {
    setBridge(true);
    setLocale("ja");
    render(<OfflineNotice />);
    act(() => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "オフラインのため、一部のコンテンツを読み込めません。",
    );
  });
});
