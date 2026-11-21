/**
 * The notifications panel the bell opens on the current page: a dropdown
 * panel anchored to the bell on desktop, a sheet from the top on phones.
 * It mounts already open — the bell lazy-loads this module on first open,
 * so the Radix primitives and the list stay out of the entry chunk. Radix
 * traps focus inside the sheet, Esc closes both, and focus returns to the
 * bell on close.
 */

import { useSyncExternalStore } from "react";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  NotificationsPanelContent,
  NotificationsSignedOut,
} from "@/features/notifications/notifications-panel-content";
import type { NotificationBellRef } from "@/features/notifications/notification-bell";

const DESKTOP_QUERY = "(min-width: 768px)";

function subscribeDesktop(onChange: () => void): () => void {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isDesktop(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** True on screens wide enough for the popover instead of the sheet. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, isDesktop, () => true);
}

export function NotificationsPanel({
  open,
  onOpenChange,
  signedIn,
  anchorRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Signed-out visitors see the sign-in panel instead of the list. */
  signedIn: boolean;
  /** The bell button: the popover's anchor and where focus returns. */
  anchorRef: NotificationBellRef;
}) {
  const desktop = useIsDesktop();
  const content = signedIn ? (
    <NotificationsPanelContent showHeader />
  ) : (
    <NotificationsSignedOut />
  );

  /** Closing hands focus back to the bell. */
  const handleOpenChange = (next: boolean): void => {
    if (!next) anchorRef.current?.focus();
    onOpenChange(next);
  };

  if (desktop) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        {/* The bell stays in the entry chunk; the panel anchors to it
            virtually and drops focus back on it when it closes. */}
        <PopoverAnchor virtualRef={anchorRef} />
        <PopoverContent align="end" className="w-96 p-4">
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="top" className="max-h-[85dvh] overflow-y-auto">
        {content}
      </SheetContent>
    </Sheet>
  );
}
