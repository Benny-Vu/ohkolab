import {
  CalculatorIcon,
  ChartColumnIcon,
  CircleUserIcon,
  Gamepad2Icon,
  GraduationCapIcon,
  HouseIcon,
  MessageCircleIcon,
  NotebookPenIcon,
  SwordsIcon,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n/en";
import { battlesEnabled } from "@/lib/battles/flag";
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

/**
 * Tab-bar label size. 11px is a documented exception in design-rules.md
 * (nav chrome, short labels); Japanese gets 12px, the Japanese floor.
 */
export function tabLabelSizeClass(locale: "en" | "ja"): string {
  return locale === "ja" ? "text-xs" : "text-[11px]";
}

/**
 * The main destinations: the header row on desktop and the tab bar on
 * phones. Everything else lives in the "More" menu (MORE_ITEMS), so the
 * phone tab bar stays at Home, Calc, Teams, Meta, More and the account tab.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: HouseIcon, end: true },
  { to: "/calc", labelKey: "nav.calc", icon: CalculatorIcon },
  { to: "/teams", labelKey: "nav.teams", icon: SwordsIcon },
  { to: "/meta", labelKey: "nav.meta", icon: ChartColumnIcon },
  { to: "/profile", labelKey: "nav.profile", icon: CircleUserIcon },
];

/**
 * The "More" menu: battle notes and the learn explainers always; the battle
 * finder and direct messages only in builds whose flags launch them
 * (VITE_BATTLES, VITE_DIRECT_MESSAGES). The messages unread badge mounts
 * lazily in the app layout, keeping the entry cost at an object literal
 * plus an icon.
 */
export const MORE_ITEMS: NavItem[] = [
  { to: "/notes", labelKey: "nav.notes", icon: NotebookPenIcon },
  { to: "/learn", labelKey: "footer.learn", icon: GraduationCapIcon },
  ...(battlesEnabled()
    ? [
        {
          to: "/battles",
          labelKey: "nav.battles" as TranslationKey,
          icon: Gamepad2Icon,
        },
      ]
    : []),
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
