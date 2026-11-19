/**
 * The push permission flow, as pure decisions over the states Capacitor
 * reports. Two flows use these:
 *
 * - the **silent** flow (app start / after sign-in): registers only when
 *   permission is already granted, and never prompts;
 * - the **user** flow (the "Turn on notifications" card): asks, then
 *   registers when granted.
 */

/** What `checkPermissions()` / `requestPermissions()` may report. */
export type PushPermissionState =
  "granted" | "denied" | "prompt" | "prompt-with-permission-request";

/**
 * Normalises a permission response. Anything Capacitor does not know (an
 * older plugin, an unexpected value) counts as denied: the flow must never
 * prompt by accident.
 */
export function permissionStateOf(receive: unknown): PushPermissionState {
  if (
    receive === "granted" ||
    receive === "prompt" ||
    receive === "prompt-with-permission-request"
  ) {
    return receive;
  }
  return "denied";
}

/** What the silent flow does next. */
export type SilentStep = "register" | "stop";

/**
 * The silent flow registers only on an already-granted permission. A prompt
 * state (first launch, never asked) stops it — asking happens only through
 * the user-visible card, never on its own.
 */
export function silentStep(state: PushPermissionState): SilentStep {
  return state === "granted" ? "register" : "stop";
}

/** What the user-initiated flow does next. */
export type UserStep = "register" | "request" | "blocked";

/**
 * The user flow: already granted means just register; denied (the user said
 * no in the OS dialog) means blocked — the OS dialog will not show again and
 * only the device settings can change it; any prompt state means ask.
 */
export function userStep(state: PushPermissionState): UserStep {
  if (state === "granted") return "register";
  if (state === "denied") return "blocked";
  return "request";
}
