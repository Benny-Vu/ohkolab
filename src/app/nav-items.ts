import {
  CalculatorIcon,
  ChartColumnIcon,
  CircleUserIcon,
  HouseIcon,
  SwordsIcon,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/lib/i18n/en";

export interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Match the path exactly (used for the home tab). */
  end?: boolean;
}

/** The five destinations shown in the header on desktop and the tab bar on phones. */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: HouseIcon, end: true },
  { to: "/calc", labelKey: "nav.calc", icon: CalculatorIcon },
  { to: "/teams", labelKey: "nav.teams", icon: SwordsIcon },
  { to: "/meta", labelKey: "nav.meta", icon: ChartColumnIcon },
  { to: "/profile", labelKey: "nav.profile", icon: CircleUserIcon },
];
