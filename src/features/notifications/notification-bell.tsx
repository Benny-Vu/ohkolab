/**
 * The header bell: opens the notifications as a panel on the current page
 * (/notifications stays a route for deep links and pushes, but nothing in
 * the app's own UI navigates there any more). The panel — the Radix
 * primitives and the notification list — lazy-loads on first open, so the
 * entry chunk carries only this button and its badge.
 */

import { lazy, Suspense, useRef, useState, type RefObject } from "react";
import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { iconHitClass } from "@/components/touch-targets";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { formatUnreadBadge } from "@/lib/notifications/badge";
import { useUnreadNotificationCount } from "@/lib/notifications/queries";

const NotificationsPanel = lazy(() =>
  import("@/features/notifications/notification-panel").then((m) => ({
    default: m.NotificationsPanel,
  })),
);

export function NotificationBell() {
  const { user } = useAuth();
  const t = useT();
  const { data } = useUnreadNotificationCount();
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const badge = user ? formatUnreadBadge(data ?? 0) : "";
  const ariaLabel = badge
    ? t("notifications.bellAriaUnread", { badge })
    : t("notifications.title");

  return (
    <>
      <Button
        ref={bellRef}
        variant="ghost"
        size="icon"
        className={`${iconHitClass} relative`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <BellIcon aria-hidden />
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-2xs font-semibold leading-4 text-primary-foreground">
            {badge}
          </span>
        )}
        {user && !badge && (
          <span
            aria-hidden
            className="absolute right-1 top-1 size-1.5 rounded-full bg-accent-brand-text"
          />
        )}
      </Button>
      {open ? (
        <Suspense fallback={null}>
          <NotificationsPanel
            open={open}
            onOpenChange={setOpen}
            signedIn={Boolean(user)}
            anchorRef={bellRef}
          />
        </Suspense>
      ) : null}
    </>
  );
}

/** The bell button's ref, as the panel's popover anchor and focus return. */
export type NotificationBellRef = RefObject<HTMLButtonElement | null>;
