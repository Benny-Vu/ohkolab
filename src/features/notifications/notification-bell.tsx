/**
 * The header bell: links to /notifications with a badge for the unread count.
 * The lead mounts it in the app layout header.
 */

import { Link } from "react-router";
import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { formatUnreadBadge } from "@/lib/notifications/badge";
import { useUnreadNotificationCount } from "@/lib/notifications/queries";

export function NotificationBell() {
  const { user } = useAuth();
  const { data } = useUnreadNotificationCount();
  const badge = user ? formatUnreadBadge(data ?? 0) : "";

  return (
    <Button variant="ghost" size="icon" asChild>
      <Link
        to="/notifications"
        aria-label={badge ? `Notifications, ${badge} unread` : "Notifications"}
        className="relative"
      >
        <BellIcon aria-hidden />
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {badge}
          </span>
        )}
        {user && !badge && (
          <span
            aria-hidden
            className="absolute right-1 top-1 size-1.5 rounded-full bg-accent-brand"
          />
        )}
      </Link>
    </Button>
  );
}
