import { App } from "@capacitor/app";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canGoBack, setupAppBackButton } from "@/lib/native/app-back";

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(),
    exitApp: vi.fn(),
  },
}));

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.clearAllMocks();
});

describe("canGoBack", () => {
  it("goes back while entries are behind the current one", () => {
    expect(canGoBack({ idx: 2 })).toBe(true);
  });

  it("stops at the first entry", () => {
    expect(canGoBack({ idx: 0 })).toBe(false);
  });

  it("rejects missing or malformed history state", () => {
    expect(canGoBack(null)).toBe(false);
    expect(canGoBack(undefined)).toBe(false);
    expect(canGoBack({})).toBe(false);
    expect(canGoBack({ idx: "1" })).toBe(false);
  });
});

describe("setupAppBackButton", () => {
  it("registers a back-button listener on the native app", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() });
    const goBack = vi.fn().mockReturnValue(true);

    await setupAppBackButton({ goBack });

    expect(App.addListener).toHaveBeenCalledOnce();
    const listener = vi.mocked(App.addListener).mock.calls[0]?.[1] as
      (() => void) | undefined;
    expect(listener).toBeTypeOf("function");

    // Pressing back steps back through the router history...
    listener?.();
    expect(goBack).toHaveBeenCalledOnce();
    expect(App.exitApp).not.toHaveBeenCalled();
  });

  it("exits the app when there is no history left", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() });
    const goBack = vi.fn().mockReturnValue(false);

    await setupAppBackButton({ goBack });
    const listener = vi.mocked(App.addListener).mock.calls[0]?.[1] as
      (() => void) | undefined;
    listener?.();

    expect(goBack).toHaveBeenCalledOnce();
    expect(App.exitApp).toHaveBeenCalledOnce();
  });

  it("removes the listener when disposed", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    const remove = vi.fn();
    vi.mocked(App.addListener).mockResolvedValue({ remove });

    const dispose = await setupAppBackButton({ goBack: () => true });
    dispose();

    expect(remove).toHaveBeenCalledOnce();
  });

  it("does nothing on the web", async () => {
    const dispose = await setupAppBackButton({ goBack: () => true });
    dispose();
    expect(App.addListener).not.toHaveBeenCalled();
  });
});
