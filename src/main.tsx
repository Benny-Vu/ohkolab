import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import "@/index.css";
import { Providers } from "@/app/providers";
import { router } from "@/app/router";
import { createAuthActions } from "@/lib/auth/auth-actions";
import { initDemoMode } from "@/lib/demo-mode";
import { loadJapaneseDictionary } from "@/lib/i18n/ja-loader";
import { getLocale, initLocale } from "@/lib/i18n/locale";
import { initSentry } from "@/lib/telemetry/sentry";
import { supabase } from "@/lib/supabase";

initSentry();
// Mirrors the active locale onto <html lang> before the first paint.
initLocale();
// Recording mode (?demo=1) is read before the first render, so personal UI
// never flashes in a recording.
initDemoMode();

// In the native app, sign-in runs in the system browser and returns through
// the custom scheme; the listener that finishes that redirect lives in its
// own chunk and is only loaded when the Capacitor bridge is present (the
// same read `isNativeApp()` in `@/lib/platform` makes), so the web entry
// never pays for it.
const bridge = (
  globalThis as {
    Capacitor?: { isNativePlatform?: () => boolean };
  }
).Capacitor;
if (bridge?.isNativePlatform?.() === true && supabase) {
  void import("@/lib/auth/native-auth").then((nativeAuth) =>
    nativeAuth.startNativeAuthListener({
      completeAuthRedirect: createAuthActions(supabase).completeAuthRedirect,
    }),
  );
}

function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
}

// Japanese visitors wait for their dictionary chunk before the first render,
// so they never see the English fallback flash in. The wait is capped: on a
// slow or failed load the app renders anyway and switches when it arrives.
const JA_FIRST_PAINT_WAIT_MS = 2500;
if (getLocale() === "ja") {
  void Promise.race([
    loadJapaneseDictionary(),
    new Promise((resolve) => setTimeout(resolve, JA_FIRST_PAINT_WAIT_MS)),
  ])
    .catch(() => {})
    .finally(render);
} else {
  render();
}
