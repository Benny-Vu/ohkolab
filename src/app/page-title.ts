import { useEffect } from "react";
import { useLocation } from "react-router";

import { trackPageView } from "@/lib/telemetry/analytics";
import { t } from "@/lib/i18n/t";
import { useLocale } from "@/lib/i18n/locale";
import type { TranslationKey } from "@/lib/i18n/en";

const SITE_NAME = "OHKOLab";

/** Page titles for routes without parameters, keyed by exact path. */
const EXACT_TITLES: Record<string, TranslationKey> = {
  "/admin/appeals": "pageTitle.appeals",
  "/admin/feedback": "pageTitle.feedback",
  "/admin/reports": "pageTitle.reports",
  "/calc": "calc.title",
  "/dev/styleguide": "pageTitle.styleguide",
  "/groups": "groups.homeTitle",
  "/groups/new": "groups.newTitle",
  "/notifications": "notifications.title",
  "/teams": "teams.title",
  "/meta": "meta.title",
  "/profile": "nav.profile",
  "/login": "common.signIn",
  "/auth/callback": "pageTitle.signingIn",
  "/reset-password": "pageTitle.resetPassword",
  "/terms": "footer.terms",
  "/privacy": "footer.privacy",
  "/delete-account": "pageTitle.deleteAccount",
};

/** Page titles for parameterised routes, keyed by path prefix. */
const PREFIX_TITLES: [prefix: string, key: TranslationKey][] = [
  ["/teams/", "pageTitle.team"],
  ["/post/", "pageTitle.post"],
  ["/g/", "pageTitle.group"],
  ["/moderation/", "moderation.noticeTitle"],
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

/** The browser tab title for a route path, in the active locale. */
export function titleForPath(pathname: string): string {
  if (pathname === "/") {
    return SITE_NAME;
  }
  const exact = EXACT_TITLES[pathname];
  if (exact) {
    return withSite(t(exact));
  }
  for (const [prefix, key] of PREFIX_TITLES) {
    if (pathname.startsWith(prefix)) {
      return withSite(t(key));
    }
  }
  const publicProfile = /^\/u\/([^/]+)\/?$/.exec(pathname);
  if (publicProfile?.[1]) {
    return withSite(decodeSegment(publicProfile[1]));
  }
  return withSite(t("system.notFoundTitle"));
}

/** Keeps the browser tab title in sync with the route and the locale. */
export function usePageTitle(): void {
  const { pathname } = useLocation();
  const [locale] = useLocale();
  useEffect(() => {
    document.title = titleForPath(pathname);
  }, [pathname, locale]);
}

/** Records an anonymous page view for the current route. */
export function usePageView(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
}
