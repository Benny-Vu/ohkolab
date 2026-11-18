import { isNativeApp } from "@/lib/platform";

/**
 * Android hardware back button. `App.addListener("backButton", ...)` fires
 * whenever the user presses back; without a listener Capacitor would use its
 * default webview handling, which does not know about the router.
 *
 * The `@capacitor/app` import stays dynamic behind `isNativeApp()` so the
 * plugin code never reaches the web bundle.
 */

/** Stepping back through the browsing history. */
export interface AppBackOptions {
  /**
   * Steps back one entry in the browsing history. Returns `false` when there
   * is nothing left to go back to, so the caller can exit the app.
   */
  goBack(): boolean;
}

/**
 * True when the history has an entry behind the current one. React Router
 * keeps the entry index as `idx` in the history state.
 */
export function canGoBack(historyState: unknown): boolean {
  if (typeof historyState !== "object" || historyState === null) return false;
  const idx = (historyState as { idx?: unknown }).idx;
  return typeof idx === "number" && idx > 0;
}

/** Steps the window history back, if there is an entry to step back to. */
export function goBackInHistory(): boolean {
  if (!canGoBack(window.history.state)) return false;
  window.history.back();
  return true;
}

/**
 * Registers the hardware back button: steps back in the router history and
 * exits the app once the home screen is reached. Resolves to a disposer.
 * No-op on the web.
 */
export async function setupAppBackButton(
  options: AppBackOptions,
): Promise<() => void> {
  if (!isNativeApp()) return () => {};
  const { App } = await import("@capacitor/app");
  const listener = await App.addListener("backButton", () => {
    if (!options.goBack()) void App.exitApp();
  });
  return () => {
    void listener.remove();
  };
}
