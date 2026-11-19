import { afterEach, describe, expect, it, vi } from "vitest";

import { isPushAvailable, pushFlagOn } from "@/lib/push/flag";

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.unstubAllEnvs();
});

describe("pushFlagOn", () => {
  it("is on only for the exact string 'true'", () => {
    vi.stubEnv("VITE_PUSH", "");
    expect(pushFlagOn()).toBe(false);
    vi.stubEnv("VITE_PUSH", "false");
    expect(pushFlagOn()).toBe(false);
    vi.stubEnv("VITE_PUSH", "TRUE");
    expect(pushFlagOn()).toBe(false);
    vi.stubEnv("VITE_PUSH", "true");
    expect(pushFlagOn()).toBe(true);
  });
});

describe("isPushAvailable", () => {
  it("needs the flag and the native shell together", () => {
    vi.stubEnv("VITE_PUSH", "true");
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    expect(isPushAvailable()).toBe(true);

    // Web build: never, even with the flag on.
    delete globalWithBridge.Capacitor;
    expect(isPushAvailable()).toBe(false);

    // Flag off: never, even in the native app.
    vi.stubEnv("VITE_PUSH", "");
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    expect(isPushAvailable()).toBe(false);
  });
});
