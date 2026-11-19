import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOnlineStatus } from "@/lib/native/use-online";

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
    status: { connected: true, connectionType: "wifi" } as {
      connected: boolean;
      connectionType: string;
    },
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

vi.mock("@capacitor/network", () => ({ Network: networkMocks.Network }));

function setNavigatorOnLine(value: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    writable: true,
    value,
  });
}

/** Renders the hook fresh with the native bridge present (module state reset). */
async function renderNativeHook() {
  globalWithBridge.Capacitor = {
    getPlatform: () => "android",
    isNativePlatform: () => true,
  };
  vi.resetModules();
  const fresh = await import("@/lib/native/use-online");
  return renderHook(() => fresh.useOnlineStatus());
}

beforeEach(() => {
  networkMocks.state.status = { connected: true, connectionType: "wifi" };
  networkMocks.state.listener = undefined;
});

afterEach(() => {
  // Back to the defaults: connected, no bridge.
  setNavigatorOnLine(true);
  delete globalWithBridge.Capacitor;
  vi.resetModules();
});

describe("useOnlineStatus on the web", () => {
  it("starts online and follows the window online/offline events", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    // The browser flips navigator.onLine and fires the event with it.
    act(() => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setNavigatorOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("starts offline when the browser reports no connection", () => {
    setNavigatorOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });
});

describe("useOnlineStatus in the native app", () => {
  it("reports the plugin's status once it resolves (offline start)", async () => {
    networkMocks.state.status = { connected: false, connectionType: "none" };
    const { result } = await renderNativeHook();

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("follows the plugin's networkStatusChange events", async () => {
    const { result } = await renderNativeHook();

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    act(() => {
      networkMocks.state.listener?.({
        connected: false,
        connectionType: "none",
      });
    });
    expect(result.current).toBe(false);

    act(() => {
      networkMocks.state.listener?.({
        connected: true,
        connectionType: "wifi",
      });
    });
    expect(result.current).toBe(true);
  });

  it("subscribes exactly once, no matter how many components ask", async () => {
    const first = await renderNativeHook();
    await waitFor(() => {
      expect(networkMocks.Network.getStatus).toHaveBeenCalledTimes(1);
    });

    globalWithBridge.Capacitor = {
      getPlatform: () => "android",
      isNativePlatform: () => true,
    };
    const fresh = await import("@/lib/native/use-online");
    renderHook(() => fresh.useOnlineStatus());
    renderHook(() => fresh.useOnlineStatus());

    expect(networkMocks.Network.addListener).toHaveBeenCalledTimes(1);
    expect(networkMocks.Network.getStatus).toHaveBeenCalledTimes(1);
    first.unmount();
  });
});
