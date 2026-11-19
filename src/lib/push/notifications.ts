import { isPushAvailable } from "@/lib/push/flag";
import { permissionStateOf, silentStep, userStep } from "@/lib/push/permission";
import { getPushPlugin, type PushPlugin } from "@/lib/push/plugin";
import { notificationPath, upsertPushToken } from "@/lib/push/tokens";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

/**
 * The push glue: token registration, silent re-registration after sign-in,
 * and tap navigation. Everything here runs only when the flag is on AND the
 * app is native (`isPushAvailable()`); the module itself is imported lazily
 * from the native shell, so a flag-off or web build never loads it.
 *
 * - `registration` (first registration and every FCM token rotation) upserts
 *   the token into `push_tokens` for the signed-in user;
 * - the silent flow registers after sign-in or app start only when the OS
 *   permission is already granted — it never prompts;
 * - `pushNotificationActionPerformed` navigates the `data.path` of the tap,
 *   including the event that arrives right after a cold start (the plugin
 *   replays the launch tap to the first listener);
 * - sign-out keeps the token row (a nice-to-have cleanup, noted in the wave
 *   report); the listeners themselves are removed by the disposer.
 */

export interface PushGlueOptions {
  /** The Supabase client for token writes. Null skips every write. */
  client?: AppSupabaseClient | null;
  /** Navigates in-app, from React Router. */
  navigate: (path: string) => void;
  /** Test seam: the plugin to use instead of the real one. */
  plugin?: PushPlugin;
  /** Test seam: returns the signed-in user's id, or null. */
  getUserId?: () => Promise<string | null>;
  /** Test seam: subscribes to auth changes; returns an unsubscribe. */
  subscribeToAuth?: (listener: (event: string) => void) => () => void;
}

/** The signed-in user's id from the current session, or null. */
async function sessionUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** The real auth subscription, when Supabase is configured. */
function subscribeToSupabaseAuth(
  listener: (event: string) => void,
): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) =>
    listener(event as string),
  );
  return () => data.subscription.unsubscribe();
}

/**
 * Registers when the OS permission is already granted; never asks. Used
 * after sign-in and on app start with a session, so a returning user keeps
 * receiving pushes without ever seeing the OS dialog out of the blue.
 */
export async function registerIfAlreadyGranted(
  plugin: PushPlugin,
): Promise<boolean> {
  const { receive } = await plugin.checkPermissions();
  if (silentStep(permissionStateOf(receive)) !== "register") return false;
  await plugin.register();
  return true;
}

/** What `requestPermissionAndRegister` ended with. */
export type RequestPermissionOutcome = "registered" | "denied";

/**
 * The user-initiated flow ("Turn on notifications"): asks when the OS allows
 * it, then registers. Returns "denied" when the OS will not show the dialog
 * again — only the device settings can change that.
 */
export async function requestPermissionAndRegister(
  plugin: PushPlugin,
): Promise<RequestPermissionOutcome> {
  const { receive: current } = await plugin.checkPermissions();
  const step = userStep(permissionStateOf(current));
  if (step === "blocked") return "denied";
  if (step === "register") {
    await plugin.register();
    return "registered";
  }
  const { receive } = await plugin.requestPermissions();
  if (silentStep(permissionStateOf(receive)) !== "register") return "denied";
  await plugin.register();
  return "registered";
}

/**
 * Mounts the push glue and resolves to a disposer that removes every
 * listener. No-op (a no-op disposer) unless the flag is on and the app is
 * native.
 */
export async function setupPushNotifications(
  options: PushGlueOptions,
): Promise<() => void> {
  if (!isPushAvailable()) return () => {};
  const plugin = options.plugin ?? (await getPushPlugin());
  const client = options.client ?? null;
  const getUserId = options.getUserId ?? sessionUserId;
  const subscribeToAuth = options.subscribeToAuth ?? subscribeToSupabaseAuth;

  const handles: Array<{ remove(): void }> = [];

  // First registration and every FCM token rotation land here: upsert the
  // row for the signed-in user (on token, so rotation refreshes it).
  handles.push(
    await plugin.addListener("registration", (event) => {
      const token = event.value;
      void (async () => {
        const userId = await getUserId();
        if (userId === null) return;
        await upsertPushToken(client, userId, token);
      })();
    }),
  );

  // A missing Firebase config or Google Play services surfaces here; push is
  // optional, so the app carries on without a push.
  handles.push(await plugin.addListener("registrationError", () => {}));

  // Tapping a push navigates to its in-app path — while the app is open and
  // on the cold-start tap the plugin replays once this listener exists.
  handles.push(
    await plugin.addListener("pushNotificationActionPerformed", (event) => {
      const path = notificationPath(event);
      if (path !== null) options.navigate(path);
    }),
  );

  const unsubscribeAuth = subscribeToAuth((event) => {
    // INITIAL_SESSION covers app start while signed in (supabase-js fires it
    // to every new listener); SIGNED_IN covers an explicit sign-in.
    if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
    void registerIfAlreadyGranted(plugin);
  });

  return () => {
    unsubscribeAuth();
    for (const handle of handles) handle.remove();
  };
}
