import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OfflineNotice } from "@/components/offline-notice";
import { setLocale } from "@/lib/i18n/locale";

type Bridge = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}

const networkMocks = vi.hoisted(() => {
  const state = {
    status: { connected: true, connectionType: "wifi" } as NetworkStatus,
    listener: undefined as undefined | ((status: NetworkStatus) => void),
  };
  return {
    state,
    Network: {
      getStatus: vi.fn(async () => state.status),
      addListener: vi.fn(
        async (_event: string, callback: (status: NetworkStatus) => void) => {
          state.listener = callback;
          return Promise.resolve({ remove: async () => {} });
        },
      ),
    },
  };
});

// In the native app the notice is driven by @capacitor/network (the
// WebView's navigator.onLine does not track connectivity there).
vi.mock("@capacitor/network", () => ({ Network: networkMocks.Network }));

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

/**
 * Renders the notice with a fresh module chain: the online store keeps
 * singleton state (it subscribes to the plugin once per session), so each
 * native test starts a fresh store against the current plugin mock state.
 */
async function renderNativeNotice() {
  setBridge(true);
  vi.resetModules();
  // resetModules also resets the lazy Japanese dictionary loader; preload
  // the fresh instance so the ja assertions see Japanese, as in production.
  const { loadJapaneseDictionary } = await import("@/lib/i18n/ja-loader");
  await loadJapaneseDictionary();
  const fresh = await import("@/components/offline-notice");
  return render(<fresh.OfflineNotice />);
}

/** Fires a plugin status change, as the native listener would. */
function pluginStatus(connected: boolean): void {
  act(() => {
    networkMocks.state.listener?.({
      connected,
      connectionType: connected ? "wifi" : "none",
    });
  });
}

beforeEach(() => {
  setLocale("en");
  delete globalWithBridge.Capacitor;
  setNavigatorOnLine(true);
  networkMocks.state.status = { connected: true, connectionType: "wifi" };
  networkMocks.state.listener = undefined;
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

  it("stays hidden in the app while the plugin reports online", async () => {
    const view = await renderNativeNotice();
    await waitFor(() => {
      expect(networkMocks.Network.getStatus).toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();
    view.unmount();
  });

  it("appears when the app goes offline and disappears when back online", async () => {
    const view = await renderNativeNotice();
    await waitFor(() => {
      expect(networkMocks.Network.getStatus).toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();

    pluginStatus(false);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're offline. Some content may not load.",
    );

    pluginStatus(true);
    expect(screen.queryByRole("status")).toBeNull();
    view.unmount();
  });

  it("is there from the first render when the device is already offline", async () => {
    networkMocks.state.status = { connected: false, connectionType: "none" };
    const view = await renderNativeNotice();
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
    view.unmount();
  });

  it("follows the active language", async () => {
    setLocale("ja");
    const view = await renderNativeNotice();
    await waitFor(() => {
      expect(networkMocks.Network.getStatus).toHaveBeenCalled();
    });

    pluginStatus(false);
    expect(screen.getByRole("status")).toHaveTextContent(
      "オフラインのため、一部のコンテンツを読み込めません。",
    );
    view.unmount();
  });
});
