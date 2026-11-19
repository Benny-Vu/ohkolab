import { goBackInHistory, setupAppBackButton } from "@/lib/native/app-back";
import {
  openInSystemBrowser,
  setupExternalLinkInterceptor,
} from "@/lib/native/external-links";
import { pushFlagOn } from "@/lib/push/flag";
import { hideSplashScreen } from "@/lib/native/splash";
import { watchStatusBarTheme } from "@/lib/native/status-bar";
import { isNativeApp } from "@/lib/platform";

/**
 * One entry point for the native app glue, so the app shell only ever needs a
 * single dynamic import: hardware back button, status-bar theme sync,
 * external-link interception, the splash hand-off and (behind VITE_PUSH) the
 * push notification glue. The shell renders first, then this mounts, then the
 * launch splash is hidden.
 *
 * No-op on the web: `isNativeApp()` keeps the plugin code out of the
 * ohkolab.com bundle entirely.
 */

export interface NativeShellOptions {
  /**
   * Navigates in-app (from React Router). The push glue uses it to open the
   * screen a notification tap points at.
   */
  navigate?: (path: string) => void;
}

/** Mounts the native glue. Resolves to a disposer. No-op on the web. */
export async function mountNativeShell(
  options: NativeShellOptions = {},
): Promise<() => void> {
  if (!isNativeApp()) return () => {};
  const disposers: Array<() => void> = [];

  disposers.push(await setupAppBackButton({ goBack: goBackInHistory }));
  disposers.push(watchStatusBarTheme(document));
  disposers.push(
    setupExternalLinkInterceptor(
      document,
      window.location.origin,
      openInSystemBrowser,
    ),
  );
  // Push notifications ship behind VITE_PUSH: the glue module (and through
  // it the push plugin) loads only in a flag-on build of the native app.
  if (pushFlagOn() && options.navigate) {
    const { setupPushNotifications } = await import("@/lib/push/notifications");
    disposers.push(
      await setupPushNotifications({ navigate: options.navigate }),
    );
  }
  await hideSplashScreen();

  return () => {
    for (const dispose of disposers) dispose();
  };
}
