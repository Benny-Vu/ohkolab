/**
 * The pieces of Cloudflare Turnstile's script API this app uses, plus the
 * `VITE_TURNSTILE_SITE_KEY` build variable. The API is injected by
 * `challenges.cloudflare.com/turnstile/v0/api.js` as `window.turnstile`.
 */

/** Options for `window.turnstile.render`; see Turnstile's client-side API. */
export interface TurnstileRenderOptions {
  sitekey: string;
  theme?: "auto" | "light" | "dark";
  /** An ISO 639-1 code ("en", "ja") or "auto". */
  language?: string;
  /** Called with the one-time token once the challenge is solved. */
  callback?: (token: string) => void;
  /** Called when a solved token has expired and can no longer be submitted. */
  "expired-callback"?: () => void;
  /** Called when the widget itself fails (bad site key, network); no token exists. */
  "error-callback"?: (errorCode: string) => void;
}

/** `window.turnstile`, once the script has loaded. */
export interface TurnstileApi {
  render: (
    container: HTMLElement | string,
    options: TurnstileRenderOptions,
  ) => string;
  /** Restarts the challenge for a fresh token. */
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }

  interface ImportMetaEnv {
    /** The Turnstile site key; unset means the widget never shows. */
    readonly VITE_TURNSTILE_SITE_KEY?: string;
  }
}
