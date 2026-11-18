import { isNativeApp } from "@/lib/platform";

/**
 * Everything about leaving the app to authenticate and coming back: the one
 * callback address, and remembering which page to return to.
 *
 * This is the single place to change when the app ships through Capacitor.
 * There the web origin is not a usable redirect target, so
 * `getAuthCallbackUrl()` returns the app's deep link (custom scheme), and
 * the deep-link listener in `@/lib/auth/native-auth` passes the opened URL
 * to `completeAuthRedirect()` from `useAuth()`, exactly as the
 * `/auth/callback` page does.
 */

/** In-app path of the page that finishes redirects. */
export const AUTH_CALLBACK_PATH = "/auth/callback";
/** In-app path of the page where a new password is chosen. */
export const RESET_PASSWORD_PATH = "/reset-password";
/** Where to go when nothing was remembered. */
export const DEFAULT_RETURN_PATH = "/";

/**
 * The app's deep link for finishing auth redirects. Google and Discord
 * block sign-in inside embedded WebViews, so the native app always uses the
 * system browser, which sends the user back to this address.
 */
export const NATIVE_AUTH_CALLBACK_URL = "com.vuforge.ohkolab://auth/callback";

const RETURN_TO_KEY = "ohkolab:auth:return-to";

/** Pages that make no sense to return to after signing in. */
const AUTH_ONLY_PATHS = ["/login", "/auth/"];

/**
 * The address Supabase sends the browser back to after OAuth, email
 * confirmation and password-reset links. It carries no query string, so one
 * exact entry per origin in the Supabase redirect allow-list is enough.
 * The native app registers the custom scheme instead, and Android opens it
 * through the intent filter in `AndroidManifest.xml`.
 */
export function getAuthCallbackUrl(): string {
  if (isNativeApp()) return NATIVE_AUTH_CALLBACK_URL;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}${AUTH_CALLBACK_PATH}`;
}

/**
 * Makes a return target safe to navigate to: an in-app path only (never
 * another site), and never one of the auth pages themselves. Anything else
 * becomes the default path.
 */
export function sanitizeReturnTo(target: unknown): string {
  if (typeof target !== "string") return DEFAULT_RETURN_PATH;
  // Must be a path on this site: "/x". Reject "//host", "/\host" and anything
  // with control characters, which browsers can read as another origin.
  const hasControlCharacter = Array.from(target).some(
    (character) => character.charCodeAt(0) < 32,
  );
  if (!/^\/(?![/\\])/.test(target) || hasControlCharacter) {
    return DEFAULT_RETURN_PATH;
  }
  const path = target.split(/[?#]/)[0] ?? "";
  if (
    AUTH_ONLY_PATHS.some((prefix) =>
      prefix.endsWith("/")
        ? path.startsWith(prefix)
        : path === prefix || path.startsWith(`${prefix}/`),
    )
  ) {
    return DEFAULT_RETURN_PATH;
  }
  return target;
}

/**
 * Remembers where to send the user once a redirect that leaves the app comes
 * back. Local storage rather than session storage, so an email link opened in
 * a new tab of the same browser still finds it.
 */
export function rememberReturnTo(target: string): void {
  try {
    localStorage.setItem(RETURN_TO_KEY, target);
  } catch {
    // Storage can be unavailable (private mode); the user lands on the default page.
  }
}

/** Reads and forgets the remembered return target. */
export function consumeReturnTo(): string {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(RETURN_TO_KEY);
    localStorage.removeItem(RETURN_TO_KEY);
  } catch {
    // Same as above: fall through to the default.
  }
  return sanitizeReturnTo(stored);
}
