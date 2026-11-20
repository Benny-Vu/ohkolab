/**
 * Whether Turnstile is switched on: the widget only shows when the build
 * carries a site key (`VITE_TURNSTILE_SITE_KEY`). Read at call time so tests
 * (and future runtime configuration) can flip it.
 */

/** The site key, or "" when CAPTCHA is off for this build. */
export function getTurnstileSiteKey(): string {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  return typeof key === "string" ? key.trim() : "";
}

/** True when the auth forms should show the Turnstile widget. */
export function isTurnstileEnabled(): boolean {
  return getTurnstileSiteKey() !== "";
}
