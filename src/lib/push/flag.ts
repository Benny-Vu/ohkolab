import { isNativeApp } from "@/lib/platform";

/**
 * Push notifications ship switched off behind the VITE_PUSH build flag (the
 * owner turns it on once Firebase is set up and the Edge Function is
 * deployed). "true" turns the feature on, anything else hides it — the same
 * pattern as VITE_DIRECT_MESSAGES. With the flag off no push UI mounts and
 * the plugin glue is never imported.
 */

/** True only when VITE_PUSH is exactly "true" at build time. */
export function pushFlagOn(): boolean {
  return import.meta.env.VITE_PUSH === "true";
}

/**
 * True when push can be used at all: the flag is on AND the app runs inside
 * the native shell. The web build (ohkolab.com) never gets push code.
 */
export function isPushAvailable(): boolean {
  return pushFlagOn() && isNativeApp();
}
