import {
  CalculatorIcon,
  ChartColumnIcon,
  CircleUserIcon,
  HouseIcon,
  MessageCircleIcon,
  SwordsIcon,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n/en";
import { directMessagesEnabled } from "@/lib/messages/flag";

export interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Match the path exactly (used for the home tab). */
  end?: boolean;
  /**
   * "messages": the item carries the lazy unread badge (the app layout
   * mounts it only when the direct messages flag is on).
   */
  badge?: "messages";
}

/** The destinations shown in the header on desktop and the tab bar on phones. */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: HouseIcon, end: true },
  { to: "/calc", labelKey: "nav.calc", icon: CalculatorIcon },
  { to: "/teams", labelKey: "nav.teams", icon: SwordsIcon },
  { to: "/meta", labelKey: "nav.meta", icon: ChartColumnIcon },
  { to: "/profile", labelKey: "nav.profile", icon: CircleUserIcon },
  // Direct messages are built but not launched: the item (and its badge)
  // exists only in builds with VITE_DIRECT_MESSAGES=true. The unread badge
  // itself mounts lazily in the app layout, keeping the entry cost at an
  // object literal plus an icon.
  ...(directMessagesEnabled()
    ? [
        {
          to: "/messages",
          labelKey: "nav.messages" as TranslationKey,
          icon: MessageCircleIcon,
          badge: "messages" as const,
        },
      ]
    : []),
];
