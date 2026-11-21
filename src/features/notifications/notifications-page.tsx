/**
 * The notifications page (/notifications): kept for deep links and push
 * taps — the app's own UI reaches the same list through the bell's panel.
 * The shared content (list, actions, push card) lives in
 * notifications-panel-content.tsx.
 */

import { toast } from "sonner";
import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonSmTouchClass } from "@/components/touch-targets";
import { Page } from "@/components/page";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { useUnreadNotificationCount } from "@/lib/notifications/queries";
import { useMarkAllNotificationsRead } from "@/lib/notifications/mutations";
import {
  NotificationsPanelContent,
  NotificationsSignedOut,
} from "@/features/notifications/notifications-panel-content";

export function NotificationsPage() {
  const { user } = useAuth();
  const t = useT();
  const unread = useUnreadNotificationCount();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = unread.data ?? 0;

  async function handleMarkAllRead(): Promise<void> {
    const result = await markAllRead.mutateAsync();
    if (result.ok) {
      toast.success(t("notifications.allMarkedRead"));
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Page
      title={t("notifications.title")}
      description={t("notifications.description")}
      width="narrow"
      actions={
        user && unreadCount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            className={buttonSmTouchClass}
            aria-label={t("notifications.markAllAsRead")}
            onClick={() => void handleMarkAllRead()}
            loading={markAllRead.isPending}
            disabled={markAllRead.isPending}
          >
            <CheckIcon aria-hidden />
            {t("notifications.markAllAsRead")}
          </Button>
        ) : undefined
      }
    >
      {!user ? <NotificationsSignedOut /> : <NotificationsPanelContent />}
    </Page>
  );
}
