import { isNativeApp } from "@/lib/platform";

/**
 * Hides the native launch splash once the web app has rendered, so the app
 * never reveals a half-built page. The launch splash itself (dark background
 * with the monogram) is configured in `capacitor.config.ts` and the Android
 * launch theme; the `@capacitor/splash-screen` import stays dynamic behind
 * `isNativeApp()` so the plugin code never reaches the web bundle.
 */

/** Hides the launch splash with a short fade. No-op on the web. */
export async function hideSplashScreen(): Promise<void> {
  if (!isNativeApp()) return;
  const { SplashScreen } = await import("@capacitor/splash-screen");
  await SplashScreen.hide({ fadeOutDuration: 250 });
}
