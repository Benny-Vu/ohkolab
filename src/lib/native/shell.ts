import { goBackInHistory, setupAppBackButton } from "@/lib/native/app-back";
import {
  openInSystemBrowser,
  setupExternalLinkInterceptor,
} from "@/lib/native/external-links";
import { hideSplashScreen } from "@/lib/native/splash";
import { watchStatusBarTheme } from "@/lib/native/status-bar";
import { isNativeApp } from "@/lib/platform";

/**
 * One entry point for the native app glue, so the app shell only ever needs a
 * single dynamic import: hardware back button, status-bar theme sync,
 * external-link interception and the splash hand-off. The shell renders
 * first, then this mounts, then the launch splash is hidden.
 *
 * No-op on the web: `isNativeApp()` keeps the plugin code out of the
 * ohkolab.com bundle entirely.
 */

/** Mounts the native glue. Resolves to a disposer. No-op on the web. */
export async function mountNativeShell(): Promise<() => void> {
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
  await hideSplashScreen();

  return () => {
    for (const dispose of disposers) dispose();
  };
}
