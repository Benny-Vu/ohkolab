import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { buttonTouchClass } from "@/components/touch-targets";
import { useT } from "@/lib/i18n/t";
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
  /**
   * True when the widget cannot produce a token (the script failed to load
   * or the challenge errored): the message under it explains and offers a
   * retry. The submit stays held either way — fail-closed.
   */
  failed: boolean;
  /** The widget (plus its failure message) to render inside the form; null when CAPTCHA is off. */
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
  const t = useT();
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const enabled = siteKey !== "";

  function retry(): void {
    if (!enabled) return;
    setToken(null);
    setFailed(false);
    setResetKey((count) => count + 1);
  }

  return {
    enabled,
    token,
    missing: enabled && token === null,
    failed,
    widget: enabled ? (
      <div className="grid gap-2">
        <TurnstileWidget
          siteKey={siteKey}
          onToken={setToken}
          onFailed={setFailed}
          resetKey={resetKey}
        />
        {failed ? (
          <div
            role="alert"
            className="grid gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-muted-foreground">
              {t("login.captchaFailed")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={buttonTouchClass}
              onClick={retry}
            >
              {t("common.retry")}
            </Button>
          </div>
        ) : null}
      </div>
    ) : null,
    retry,
  };
}
