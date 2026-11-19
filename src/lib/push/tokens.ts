import { platformName, type PlatformName } from "@/lib/platform";
import type { AppSupabaseClient } from "@/lib/supabase";

/**
 * Token bookkeeping: the in-app path a push tap navigates to (pure), the
 * `register_push_token` RPC the plugin's registration event performs, and
 * the best-effort row cleanup on sign-out / opt-out.
 *
 * Clients never write `push_tokens` directly: the security-definer RPC
 * `register_push_token(p_token, p_platform)` registers the token for the
 * signed-in user and takes it over from whoever held it (a shared or resold
 * device stops receiving the previous user's pushes). Deletes are the one
 * exception — RLS scopes them to the caller's own rows.
 */

/**
 * The path a notification tap navigates to, from the payload's `data.path`
 * (an in-app route like `/post/<id>`), or null when the payload carries no
 * usable path. Only in-app paths count: anything without a leading `/`, and
 * protocol-relative `//host` URLs, are ignored.
 */
export function notificationPath(action: unknown): string | null {
  if (typeof action !== "object" || action === null) return null;
  const notification = (action as { notification?: unknown }).notification;
  if (typeof notification !== "object" || notification === null) return null;
  const data = (notification as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const path = (data as Record<string, unknown>).path;
  if (typeof path !== "string" || path.length === 0) return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  return path;
}

/**
 * Registers a device token for the signed-in user through the RPC.
 * Re-registration (FCM token rotation, signing in again on the same device)
 * just calls it again — the RPC keeps exactly one row per token.
 */
export async function registerPushToken(
  client: AppSupabaseClient | null,
  token: string,
  platform: PlatformName = platformName(),
): Promise<boolean> {
  if (!client || token === "") return false;
  const { error } = await client.rpc("register_push_token", {
    p_token: token,
    p_platform: platform,
  });
  return error === null;
}

/**
 * Deletes my own row for a token (RLS scopes deletes to the caller's rows).
 * Used on sign-out and when push is turned off on this device, so the device
 * stops receiving pushes even before the server-side settings catch up.
 */
export async function deletePushToken(
  client: AppSupabaseClient | null,
  token: string,
): Promise<boolean> {
  if (!client || token === "") return false;
  const { error } = await client
    .from("push_tokens")
    .delete()
    .eq("token", token);
  return error === null;
}

/**
 * The latest token this app instance registered. The registration event is
 * the only moment the FCM token is known, so it is remembered here for the
 * sign-out and opt-out cleanups; it never leaves the device otherwise.
 */
let rememberedToken: string | null = null;

/** Remembers the token of the latest registration event (glue internal). */
export function rememberDeviceToken(token: string): void {
  rememberedToken = token;
}

/** The remembered token of this device, or null before the first registration. */
export function knownDeviceToken(): string | null {
  return rememberedToken;
}

/** Forgets the remembered token (after a successful cleanup). */
export function clearRememberedDeviceToken(): void {
  rememberedToken = null;
}

/**
 * Deletes this device's token row when one is known, and forgets it. Returns
 * false when nothing was known to delete (nothing registered yet, or the
 * cleanup failed) — the server-side settings still stop the pushes.
 */
export async function deleteRememberedPushToken(
  client: AppSupabaseClient | null,
): Promise<boolean> {
  const token = rememberedToken;
  if (token === null) return false;
  const deleted = await deletePushToken(client, token);
  if (deleted) clearRememberedDeviceToken();
  return deleted;
}
