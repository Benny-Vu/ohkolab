import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar } from "@capacitor/status-bar";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mountNativeShell } from "@/lib/native/shell";

vi.mock("@capacitor/app", () => ({
  App: { addListener: vi.fn(), exitApp: vi.fn() },
}));
vi.mock("@capacitor/status-bar", () => ({
  StatusBar: { setStyle: vi.fn() },
  Style: { Dark: "DARK", Light: "LIGHT" },
}));
vi.mock("@capacitor/splash-screen", () => ({
  SplashScreen: { hide: vi.fn() },
}));
vi.mock("@capacitor/browser", () => ({
  Browser: { open: vi.fn() },
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

describe("mountNativeShell", () => {
  it("wires every piece of native glue and hides the splash", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() });
    vi.mocked(SplashScreen.hide).mockResolvedValue(undefined);

    const dispose = await mountNativeShell();

    try {
      expect(App.addListener).toHaveBeenCalledOnce();
      expect(vi.mocked(App.addListener).mock.calls[0]?.[0]).toBe("backButton");
      expect(StatusBar.setStyle).toHaveBeenCalledOnce();
      expect(SplashScreen.hide).toHaveBeenCalledOnce();

      // External clicks route to the system browser.
      document.body.innerHTML =
        '<a href="https://sentry.io/privacy/">privacy</a>';
      document.querySelector("a")!.click();
      await vi.waitFor(() =>
        expect(Browser.open).toHaveBeenCalledWith({
          url: "https://sentry.io/privacy/",
        }),
      );
    } finally {
      dispose();
      document.body.innerHTML = "";
    }
  });

  it("does nothing on the web", async () => {
    const dispose = await mountNativeShell();
    dispose();

    expect(App.addListener).not.toHaveBeenCalled();
    expect(StatusBar.setStyle).not.toHaveBeenCalled();
    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });
});
