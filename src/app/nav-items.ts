import {
  CalculatorIcon,
  ChartColumnIcon,
  CircleUserIcon,
  HouseIcon,
  SwordsIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match the path exactly (used for the home tab). */
  end?: boolean;
}

/** The five destinations shown in the header on desktop and the tab bar on phones. */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: HouseIcon, end: true },
  { to: "/calc", label: "Calc", icon: CalculatorIcon },
  { to: "/teams", label: "Teams", icon: SwordsIcon },
  { to: "/meta", label: "Meta", icon: ChartColumnIcon },
  { to: "/profile", label: "Profile", icon: CircleUserIcon },
];
