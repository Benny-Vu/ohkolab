import { useEffect } from "react";
import { useLocation } from "react-router";

import { trackPageView } from "@/lib/telemetry/analytics";
import { t } from "@/lib/i18n/t";
import { useJapaneseDictionary } from "@/lib/i18n/ja-loader";
import { useLocale } from "@/lib/i18n/locale";
import type { TranslationKey } from "@/lib/i18n/en";

const SITE_NAME = "OHKOLab";
const SITE_URL = "https://ohkolab.com";

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
  "/credits": "footer.credits",
  "/press": "footer.press",
  "/delete-account": "pageTitle.deleteAccount",
};

/** Page titles for parameterised routes, keyed by path prefix. */
const PREFIX_TITLES: [prefix: string, key: TranslationKey][] = [
  ["/teams/", "pageTitle.team"],
  ["/post/", "pageTitle.post"],
  ["/g/", "pageTitle.group"],
  ["/moderation/", "moderation.noticeTitle"],
];

/** The site's default meta description, also used on `/`. */
const HOME_DESCRIPTION: TranslationKey = "seo.homeDescription";

/** Meta descriptions for routes without parameters, keyed by exact path. */
const EXACT_DESCRIPTIONS: Record<string, TranslationKey> = {
  "/calc": "seo.calcDescription",
  "/teams": "teams.description",
  "/meta": "seo.metaDescription",
  "/groups": "seo.groupsDescription",
  "/terms": "seo.termsDescription",
  "/privacy": "seo.privacyDescription",
  "/credits": "seo.creditsDescription",
  "/press": "seo.pressDescription",
};

/** Meta descriptions for parameterised routes, keyed by path prefix. */
const PREFIX_DESCRIPTIONS: [prefix: string, key: TranslationKey][] = [
  ["/teams/", "seo.teamsDescription"],
  ["/post/", "seo.postDescription"],
  ["/u/", "seo.profileDescription"],
  ["/g/", "seo.groupDescription"],
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

/** The meta description for a route path, in the active locale. */
export function descriptionForPath(pathname: string): string {
  if (pathname !== "/") {
    const exact = EXACT_DESCRIPTIONS[pathname];
    if (exact) {
      return t(exact);
    }
    for (const [prefix, key] of PREFIX_DESCRIPTIONS) {
      if (pathname.startsWith(prefix)) {
        return t(key);
      }
    }
  }
  return t(HOME_DESCRIPTION);
}

/** The canonical URL of a route path: the site origin plus the path. */
export function canonicalForPath(pathname: string): string {
  if (pathname === "/") {
    return `${SITE_URL}/`;
  }
  return `${SITE_URL}${pathname}`;
}

/** Creates or updates a `meta[name]` tag. */
function setMetaTag(name: string, content: string): void {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/** Creates or updates the canonical link. */
function setCanonical(href: string): void {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

/**
 * Keeps the browser tab title, the meta description and the canonical link
 * in sync with the route and the locale. Runs on every client-side
 * navigation, and once more when the Japanese dictionary lands so a
 * Japanese first visit does not keep the English tags.
 */
export function usePageTitle(): void {
  const { pathname } = useLocation();
  const [locale] = useLocale();
  const japaneseReady = useJapaneseDictionary();
  useEffect(() => {
    document.title = titleForPath(pathname);
    setMetaTag("description", descriptionForPath(pathname));
    setCanonical(canonicalForPath(pathname));
  }, [pathname, locale, japaneseReady]);
}

/** Records an anonymous page view for the current route. */
export function usePageView(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
}
