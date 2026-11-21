import { afterEach, describe, expect, it, vi } from "vitest";

import { setupPushNotifications } from "@/lib/push/notifications";
import type { PushPlugin } from "@/lib/push/plugin";
import { clearRememberedDeviceToken } from "@/lib/push/tokens";

// The app shell calls setupPushNotifications({ navigate }) without a client.
// That must still write through the app's own Supabase client: a missing
// client once meant no device token was ever saved.
const app = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: null, error: null })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: app.rpc },
}));

const globalWithBridge = globalThis as {
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
};

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.unstubAllEnvs();
  clearRememberedDeviceToken();
});

describe("setupPushNotifications without a client", () => {
  it("registers the device token through the app's Supabase client", async () => {
    vi.stubEnv("VITE_PUSH", "true");
    globalWithBridge.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "android",
    };
    const listeners = new Map<string, (event: unknown) => void>();
    const plugin = {
      checkPermissions: vi.fn(async () => ({ receive: "granted" })),
      requestPermissions: vi.fn(async () => ({ receive: "granted" })),
      register: vi.fn(async () => {}),
      addListener: vi.fn(
        async (event: string, listener: (event: unknown) => void) => {
          listeners.set(event, listener);
          return { remove: () => {} };
        },
      ),
      removeAllListeners: vi.fn(async () => {}),
    } as unknown as PushPlugin;

    await setupPushNotifications({
      plugin,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: () => () => {},
    });

    listeners.get("registration")?.({ value: "device-token-1" });
    await vi.waitFor(() =>
      expect(app.rpc).toHaveBeenCalledWith("register_push_token", {
        p_token: "device-token-1",
        p_platform: "android",
      }),
    );
  });
});
