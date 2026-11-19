import { platformName, type PlatformName } from "@/lib/platform";
import type { AppSupabaseClient } from "@/lib/supabase";

/**
 * Token bookkeeping: the in-app path a push tap navigates to (pure) and the
 * `push_tokens` upsert the plugin's registration event performs.
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
 * Stores (or refreshes) an FCM token for the signed-in user. The upsert keys
 * on `token`, so FCM's rotated tokens reuse the row and bump `last_seen_at`;
 * the same row is simply refreshed when the plugin re-registers.
 */
export async function upsertPushToken(
  client: AppSupabaseClient | null,
  userId: string,
  token: string,
  platform: PlatformName = platformName(),
): Promise<boolean> {
  if (!client || userId === "" || token === "") return false;
  const { error } = await client.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  return error === null;
}
