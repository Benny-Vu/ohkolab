import { isNativeApp } from "@/lib/platform";
import {
  AUTH_CALLBACK_PATH,
  NATIVE_AUTH_CALLBACK_URL,
} from "@/lib/auth/redirects";
import type {
  AuthFailure,
  AuthResult,
  RedirectOutcome,
} from "@/lib/auth/types";

/**
 * Sign-in that leaves the app and comes back: the native deep-link side of
 * the auth flow. OAuth runs in the system browser (Google and Discord block
 * embedded WebViews), which returns the user to the custom scheme in
 * `NATIVE_AUTH_CALLBACK_URL`; Android opens that through the intent filter
 * in `AndroidManifest.xml`, and the listener here finishes the redirect
 * exactly as the `/auth/callback` page does on the web.
 *
 * Everything Capacitor is loaded through dynamic `import()` behind the
 * `isNativeApp()` checks, so the web build never pulls these modules into
 * its entry chunk.
 */

/** Where a failed native redirect is stashed for the callback page to show. */
const FAILURE_KEY = "ohkolab:auth:native-failure";

function readStoredFailure(storage: Storage): AuthFailure | null {
  try {
    const raw = storage.getItem(FAILURE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthFailure>;
    if (typeof parsed.code !== "string" || typeof parsed.message !== "string") {
      return null;
    }
    return {
      code: parsed.code as AuthFailure["code"],
      message: parsed.message,
      ...(parsed.field === undefined ? {} : { field: parsed.field }),
    };
  } catch {
    return null;
  }
}

/** The failure of the last native redirect, if any, for the callback page. */
export function readNativeAuthFailure(): AuthFailure | null {
  try {
    return readStoredFailure(sessionStorage);
  } catch {
    return null;
  }
}

/** The callback page calls this once it has shown the failure. */
export function clearNativeAuthFailure(): void {
  try {
    sessionStorage.removeItem(FAILURE_KEY);
  } catch {
    // Storage can be unavailable; then there is nothing to clear.
  }
}

export interface NativeAuthListenerOptions {
  /**
   * Moves the app to an in-app path once the redirect is finished. The
   * default does a full WebView load, which starts the app with the new
   * session; tests inject a spy.
   */
  navigate?: (path: string) => void;
}

export interface NativeAuth {
  /** The same action the `/auth/callback` page uses. */
  completeAuthRedirect: (url: string) => Promise<AuthResult<RedirectOutcome>>;
}

/** True for the app's own auth callback deep link, and nothing else. */
export function isAuthCallbackUrl(url: string): boolean {
  // The scheme carries no `//` authority; compare on the scheme prefix.
  return url.startsWith(`${NATIVE_AUTH_CALLBACK_URL}`);
}

/**
 * Finishes one opened deep link: close the system browser, exchange the
 * code, and move the app on. Kept separate from the listener setup so tests
 * can drive it directly.
 */
export async function completeNativeAuthRedirect(
  auth: NativeAuth,
  url: string,
  navigate: (path: string) => void,
): Promise<void> {
  const { Browser } = await import("@capacitor/browser");
  try {
    await Browser.close();
  } catch {
    // The browser may already be gone; closing is best effort.
  }

  const result = await auth.completeAuthRedirect(url);
  if (result.ok) {
    navigate(result.data.returnTo);
    return;
  }
  // Show the failure on the callback page, like the web flow does.
  try {
    sessionStorage.setItem(FAILURE_KEY, JSON.stringify(result.error));
  } catch {
    // Without storage the page falls back to its own error.
  }
  navigate(AUTH_CALLBACK_PATH);
}

/**
 * Starts listening for the app's auth deep link. A no-op on the web and in
 * guest mode, so callers do not need to check first. The promise rejects
 * only if the Capacitor plugin cannot be loaded at all, which leaves the
 * app exactly as it was.
 */
export async function startNativeAuthListener(
  auth: NativeAuth,
  options: NativeAuthListenerOptions = {},
): Promise<void> {
  if (!isNativeApp()) return;
  const { App } = await import("@capacitor/app");
  const navigate =
    options.navigate ?? ((path: string) => window.location.assign(path));
  await App.addListener("appUrlOpen", (event) => {
    const url = event.url ?? "";
    if (!isAuthCallbackUrl(url)) return;
    void completeNativeAuthRedirect(auth, url, navigate);
  });
}
