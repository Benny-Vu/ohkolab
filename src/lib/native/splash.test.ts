import { SplashScreen } from "@capacitor/splash-screen";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hideSplashScreen } from "@/lib/native/splash";

vi.mock("@capacitor/splash-screen", () => ({
  SplashScreen: { hide: vi.fn() },
}));

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.clearAllMocks();
});

describe("hideSplashScreen", () => {
  it("hides the launch splash with a short fade on the native app", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };

    await hideSplashScreen();

    expect(SplashScreen.hide).toHaveBeenCalledOnce();
    expect(vi.mocked(SplashScreen.hide).mock.calls[0]?.[0]).toEqual({
      fadeOutDuration: 250,
    });
  });

  it("does nothing on the web", async () => {
    await hideSplashScreen();
    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });
});
