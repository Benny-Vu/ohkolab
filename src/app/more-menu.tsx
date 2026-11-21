import { lazy, Suspense } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDownIcon, EllipsisIcon } from "lucide-react";

import { MORE_ITEMS, tabLabelSizeClass } from "@/app/nav-items";
import { prefetchDestination } from "@/app/prefetch";
import { menuItemClass } from "@/components/menu-item-class";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { cn } from "@/lib/utils";

// The unread badge loads lazily and only in builds with direct messages on.
const MessagesNavBadge = lazy(() =>
  import("@/features/messages/nav-unread-badge").then((m) => ({
    default: m.MessagesNavBadge,
  })),
);

interface MoreMenuProps {
  /** "header" for the desktop header, "tab" for the phone tab bar. */
  variant: "header" | "tab";
  /** Recording mode hides personal UI such as the unread badge. */
  demo?: boolean;
}

/** True while the current page is one of the More menu's destinations. */
function useMoreActive(): boolean {
  const { pathname } = useLocation();
  return MORE_ITEMS.some(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
}

/**
 * The "More" menu: battle notes, the battle finder and messages (the last
 * two only when their flags are on). It keeps the phone tab bar to six
 * tabs; the messages unread badge shows on the trigger and on its item.
 */
export function MoreMenu({ variant, demo = false }: MoreMenuProps) {
  const t = useT();
  const [locale] = useLocale();
  const active = useMoreActive();
  const showBadge = directMessagesEnabled() && !demo;
  const badge = showBadge ? (
    <Suspense fallback={null}>
      <MessagesNavBadge />
    </Suspense>
  ) : null;

  return (
    <DropdownMenu>
      {variant === "header" ? (
        <DropdownMenuTrigger
          className={cn(
            "relative flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:text-foreground",
            // Same underline as the other header links while a More page is open.
            "after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:origin-center after:bg-accent-brand-text after:scale-x-0 after:opacity-0 after:transition-[opacity,transform] after:duration-(--motion-base) after:ease-(--motion-ease-out)",
            active && "text-foreground after:scale-x-100 after:opacity-100",
          )}
        >
          {t("nav.more")}
          <ChevronDownIcon aria-hidden className="size-3.5" />
          {badge}
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          className={cn(
            "relative flex h-full w-full min-w-0 flex-col items-center justify-center gap-0.5 font-medium text-muted-foreground aria-expanded:text-foreground",
            tabLabelSizeClass(locale),
            "before:absolute before:top-0 before:h-0.5 before:w-8 before:origin-center before:bg-accent-brand-text before:scale-x-0 before:opacity-0 before:transition-[opacity,transform] before:duration-(--motion-base) before:ease-(--motion-ease-out)",
            active && "text-foreground before:scale-x-100 before:opacity-100",
          )}
        >
          <span className="relative">
            <EllipsisIcon aria-hidden className="size-5" />
            {badge ? (
              <span className="absolute -top-1.5 left-3.5">{badge}</span>
            ) : null}
          </span>
          <span className="max-w-full truncate px-0.5">{t("nav.more")}</span>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align="end"
        side={variant === "tab" ? "top" : undefined}
        className="w-56"
      >
        {MORE_ITEMS.map((item) => (
          <DropdownMenuItem key={item.to} asChild className={menuItemClass}>
            <Link
              to={item.to}
              viewTransition
              onMouseEnter={() => prefetchDestination(item.to)}
              onFocus={() => prefetchDestination(item.to)}
              className="flex items-center gap-2"
            >
              <item.icon aria-hidden className="size-4" />
              {t(item.labelKey)}
              {item.badge === "messages" ? badge : null}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
