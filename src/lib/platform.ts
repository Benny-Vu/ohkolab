/**
 * Platform detection for the Capacitor native apps.
 *
 * In a native app the Capacitor bridge injects the `Capacitor` object onto
 * `globalThis` before any app code runs — it is the same object the
 * `Capacitor` export of `@capacitor/core` proxies to. Reading the injected
 * bridge directly keeps `@capacitor/core` out of the web entry chunk, so
 * the ohkolab.com build stays exactly as it was; the heavier native plugin
 * modules are only ever loaded through dynamic `import()` behind these
 * checks.
 */
interface CapacitorBridge {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

function bridge(): CapacitorBridge | undefined {
  return (globalThis as { Capacitor?: CapacitorBridge }).Capacitor;
}

/** True when running inside a native app shell (Capacitor). */
export function isNativeApp(): boolean {
  return bridge()?.isNativePlatform?.() === true;
}

/** The platforms the app ships for, plus the web fallback. */
export type PlatformName = "android" | "ios" | "web";

/**
 * The platform Capacitor reports: "android" or "ios" inside a native app,
 * "web" everywhere else.
 */
export function platformName(): PlatformName {
  const platform = isNativeApp() ? bridge()?.getPlatform?.() : undefined;
  if (platform === "android" || platform === "ios") return platform;
  return "web";
}
