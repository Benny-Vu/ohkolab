import { useEffect } from "react";
import { useLocation } from "react-router";

import { trackPageView } from "@/lib/telemetry/analytics";

const SITE_NAME = "OHKOLab";

/** Page titles for routes without parameters, keyed by exact path. */
const EXACT_TITLES: Record<string, string> = {
  "/admin/appeals": "Appeals",
  "/admin/feedback": "Feedback",
  "/admin/reports": "Reports",
  "/calc": "Damage calculator",
  "/dev/styleguide": "Styleguide",
  "/groups": "Groups",
  "/groups/new": "Create a group",
  "/notifications": "Notifications",
  "/teams": "Teams",
  "/meta": "Metagame",
  "/profile": "Profile",
  "/login": "Sign in",
  "/auth/callback": "Signing in",
  "/reset-password": "Reset password",
  "/terms": "Terms",
  "/privacy": "Privacy",
};

/** Page titles for parameterised routes, keyed by path prefix. */
const PREFIX_TITLES: [prefix: string, title: string][] = [
  ["/teams/", "Team"],
  ["/post/", "Post"],
  ["/g/", "Group"],
  ["/moderation/", "Moderation notice"],
];

function withSite(title: string): string {
  return `${title} · ${SITE_NAME}`;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** The browser tab title for a route path. */
export function titleForPath(pathname: string): string {
  if (pathname === "/") {
    return SITE_NAME;
  }
  const exact = EXACT_TITLES[pathname];
  if (exact) {
    return withSite(exact);
  }
  for (const [prefix, title] of PREFIX_TITLES) {
    if (pathname.startsWith(prefix)) {
      return withSite(title);
    }
  }
  const publicProfile = /^\/u\/([^/]+)\/?$/.exec(pathname);
  if (publicProfile?.[1]) {
    return withSite(decodeSegment(publicProfile[1]));
  }
  return withSite("Page not found");
}

/** Keeps the browser tab title in sync with the current route. */
export function usePageTitle(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = titleForPath(pathname);
  }, [pathname]);
}

/** Records an anonymous page view for the current route. */
export function usePageView(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
}
