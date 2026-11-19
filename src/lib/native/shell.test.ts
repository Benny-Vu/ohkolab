import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar } from "@capacitor/status-bar";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mountNativeShell } from "@/lib/native/shell";
import { setupPushNotifications } from "@/lib/push/notifications";

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
vi.mock("@/lib/push/notifications", () => ({
  setupPushNotifications: vi.fn(),
}));

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

beforeEach(() => {
  // Push ships off; the shell tests opt in where they need it.
  vi.stubEnv("VITE_PUSH", "");
});

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  document.documentElement.className = "";
});

describe("mountNativeShell", () => {
  it("wires every piece of native glue and hides the splash", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() });
    vi.mocked(SplashScreen.hide).mockResolvedValue(undefined);
    vi.mocked(setupPushNotifications).mockResolvedValue(() => {});

    const navigate = vi.fn();
    const dispose = await mountNativeShell({ navigate });

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

      // Push ships off: the glue is never mounted, plugin or not.
      expect(setupPushNotifications).not.toHaveBeenCalled();
    } finally {
      dispose();
      document.body.innerHTML = "";
    }
  });

  it("mounts the push glue behind VITE_PUSH and hands it the navigate callback", async () => {
    vi.stubEnv("VITE_PUSH", "true");
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() });
    vi.mocked(SplashScreen.hide).mockResolvedValue(undefined);
    const pushDispose = vi.fn();
    vi.mocked(setupPushNotifications).mockResolvedValue(pushDispose);

    const navigate = vi.fn();
    const dispose = await mountNativeShell({ navigate });

    expect(setupPushNotifications).toHaveBeenCalledOnce();
    expect(setupPushNotifications).toHaveBeenCalledWith({ navigate });

    dispose();
    expect(pushDispose).toHaveBeenCalledOnce();
  });

  it("skips the push glue without a navigate callback", async () => {
    vi.stubEnv("VITE_PUSH", "true");
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() });
    vi.mocked(SplashScreen.hide).mockResolvedValue(undefined);

    const dispose = await mountNativeShell();
    dispose();

    expect(setupPushNotifications).not.toHaveBeenCalled();
  });

  it("does nothing on the web", async () => {
    const dispose = await mountNativeShell({ navigate: vi.fn() });
    dispose();

    expect(App.addListener).not.toHaveBeenCalled();
    expect(StatusBar.setStyle).not.toHaveBeenCalled();
    expect(SplashScreen.hide).not.toHaveBeenCalled();
    expect(setupPushNotifications).not.toHaveBeenCalled();
  });
});
