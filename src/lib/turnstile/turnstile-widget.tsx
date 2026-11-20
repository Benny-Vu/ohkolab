import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/lib/i18n/locale";
import { loadTurnstile } from "@/lib/turnstile/script";
import { useTheme } from "@/lib/theme";

interface TurnstileWidgetProps {
  siteKey: string;
  /**
   * Called with the one-time token once the challenge is solved, and with
   * null whenever no token exists any more (expiry, widget error, unmount),
   * so the form can hold its submit back until there is a fresh one.
   */
  onToken: (token: string | null) => void;
  /**
   * True when the widget cannot produce a token at all: the script
   * failed to load or the challenge errored. Back to false once a
   * challenge renders or solves again, so the form can explain the
   * silent empty box and offer a retry while staying fail-closed.
   */
  onFailed: (failed: boolean) => void;
  /**
   * Bump to restart the challenge and demand a fresh token — after a failed
   * submit consumed the previous one, or after a failure to retry the load.
   * Stays 0 until then.
   */
  resetKey?: number;
  className?: string;
}

/**
 * The Cloudflare Turnstile challenge, rendered explicitly into its container
 * once the (lazily loaded) script is ready. Follows the app's theme and
 * language; both recreate the widget with the new render options.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  onFailed,
  resetKey = 0,
  className,
}: TurnstileWidgetProps) {
  const [theme] = useTheme();
  const [locale] = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onFailedRef = useRef(onFailed);
  // Bumped when a retry arrives with no widget to reset, so the whole
  // load-and-render effect runs again (a failed script load is retried).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    onTokenRef.current = onToken;
    onFailedRef.current = onFailed;
  }, [onToken, onFailed]);

  // Render (and re-render on a theme or language change) the widget. Removal
  // on cleanup keeps the page's token in step with what is on screen.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    loadTurnstile().then(
      () => {
        if (disposed || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          theme,
          language: locale,
          callback: (token) => {
            onFailedRef.current(false);
            onTokenRef.current(token);
          },
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            onFailedRef.current(true);
            onTokenRef.current(null);
          },
        });
      },
      () => {
        // The script cannot be loaded, so a token can never arrive.
        if (disposed) return;
        onFailedRef.current(true);
        onTokenRef.current(null);
      },
    );

    return () => {
      disposed = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (widgetId !== null) window.turnstile?.remove(widgetId);
      onTokenRef.current(null);
    };
  }, [siteKey, theme, locale, reloadKey]);

  // A bumped resetKey restarts the challenge: in place when a widget
  // exists, or by re-attempting the whole load when it never rendered.
  useEffect(() => {
    if (resetKey === 0) return;
    const widgetId = widgetIdRef.current;
    if (widgetId === null) {
      setReloadKey((count) => count + 1);
    } else {
      window.turnstile?.reset(widgetId);
    }
    onTokenRef.current(null);
  }, [resetKey]);

  return <div ref={containerRef} className={className} />;
}
