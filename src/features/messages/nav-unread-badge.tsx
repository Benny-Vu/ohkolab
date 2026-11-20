import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { formatUnreadBadge } from "@/lib/notifications/badge";
import { useUnreadMessageCount } from "@/lib/messages/queries";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

/**
 * The unread badge on the Messages nav item. It renders nothing and queries
 * nothing while the flag is off or nobody is signed in; the app layout
 * mounts it lazily, so a flag-off build never even downloads this chunk.
 */
export function MessagesNavBadge({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const { user } = useAuth();
  const count = useUnreadMessageCount(client);

  if (!directMessagesEnabled() || !user) {
    return null;
  }
  const badge = formatUnreadBadge(count.data ?? 0);
  if (!badge) {
    return null;
  }
  return (
    <span className="ml-1 inline-grid min-w-4 place-items-center rounded-full bg-primary px-1 text-2xs font-semibold leading-4 text-primary-foreground">
      {badge}
      <span className="sr-only">{t("notifications.unreadSr")}</span>
    </span>
  );
}
