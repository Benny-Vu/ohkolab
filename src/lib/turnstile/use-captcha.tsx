import { useState, type ReactNode } from "react";

import { getTurnstileSiteKey } from "@/lib/turnstile/site-key";
import { TurnstileWidget } from "@/lib/turnstile/turnstile-widget";

/** What an auth form needs to gate its submit on the Turnstile challenge. */
export interface CaptchaState {
  /** False when no site key is configured: the forms work exactly as without CAPTCHA. */
  enabled: boolean;
  /** The live token, or null while it is missing, expired or being renewed. */
  token: string | null;
  /** True while the widget is shown and there is no token yet: hold the submit. */
  missing: boolean;
  /** The widget to render inside the form; null when CAPTCHA is off. */
  widget: ReactNode;
  /** Drops the current token and restarts the challenge for a fresh one. */
  retry: () => void;
}

/**
 * The Turnstile state of one auth form: the token it will submit, plus the
 * widget that produces it. Each form calls this separately, so a token is
 * never shared or reused between the sign-in, sign-up and reset flows.
 */
export function useCaptcha(): CaptchaState {
  const siteKey = getTurnstileSiteKey();
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const enabled = siteKey !== "";

  return {
    enabled,
    token,
    missing: enabled && token === null,
    widget: enabled ? (
      <TurnstileWidget
        siteKey={siteKey}
        onToken={setToken}
        resetKey={resetKey}
      />
    ) : null,
    retry: () => {
      if (!enabled) return;
      setToken(null);
      setResetKey((count) => count + 1);
    },
  };
}
