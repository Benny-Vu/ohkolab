import { afterEach, describe, expect, it } from "vitest";

import { isNativeApp, platformName } from "@/lib/platform";

type Bridge = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

afterEach(() => {
  delete globalWithBridge.Capacitor;
});

describe("platform detection", () => {
  it("reports the web platform when the Capacitor bridge is absent", () => {
    expect(isNativeApp()).toBe(false);
    expect(platformName()).toBe("web");
  });

  it("reports the web platform when the bridge says so", () => {
    globalWithBridge.Capacitor = {
      getPlatform: () => "web",
      isNativePlatform: () => false,
    };
    expect(isNativeApp()).toBe(false);
    expect(platformName()).toBe("web");
  });

  it("detects the Android app", () => {
    globalWithBridge.Capacitor = {
      getPlatform: () => "android",
      isNativePlatform: () => true,
    };
    expect(isNativeApp()).toBe(true);
    expect(platformName()).toBe("android");
  });

  it("detects the iOS app", () => {
    globalWithBridge.Capacitor = {
      getPlatform: () => "ios",
      isNativePlatform: () => true,
    };
    expect(isNativeApp()).toBe(true);
    expect(platformName()).toBe("ios");
  });

  it("falls back to web when the bridge is only half there", () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    expect(isNativeApp()).toBe(true);
    // No getPlatform: the name falls back to web rather than crashing.
    expect(platformName()).toBe("web");
  });
});
