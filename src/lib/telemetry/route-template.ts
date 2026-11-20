/**
 * Maps a browser location to a route template such as `/u/:username`, so
 * telemetry never sees real usernames, ids, query strings or fragments.
 */

const EXACT_ROUTES: ReadonlySet<string> = new Set([
  "/",
  "/terms",
  "/privacy",
  "/calc",
  "/teams",
  "/meta",
  "/profile",
  "/login",
  "/auth/callback",
  "/reset-password",
  "/admin/reports",
  "/admin/appeals",
  "/admin/feedback",
  "/notifications",
  "/groups",
  "/groups/new",
]);

const PARAMETER_ROUTES: ReadonlyArray<{ pattern: RegExp; template: string }> = [
  { pattern: /^\/teams\/[^/]+$/, template: "/teams/:teamId" },
  { pattern: /^\/post\/[^/]+$/, template: "/post/:postId" },
  { pattern: /^\/u\/[^/]+$/, template: "/u/:username" },
  { pattern: /^\/moderation\/[^/]+$/, template: "/moderation/:actionId" },
  { pattern: /^\/g\/[^/]+$/, template: "/g/:slug" },
  { pattern: /^\/from\/[^/]+$/, template: "/from/:source" },
];

/** The template for paths that match no known route. */
export const UNKNOWN_ROUTE = "/unknown";

export function routeTemplate(pathname: string): string {
  const withoutFragment = pathname.split("#")[0] ?? pathname;
  const withoutQuery = withoutFragment.split("?")[0] ?? withoutFragment;
  const normalized =
    withoutQuery.length > 1 && withoutQuery.endsWith("/")
      ? withoutQuery.slice(0, -1)
      : withoutQuery;
  if (EXACT_ROUTES.has(normalized)) {
    return normalized;
  }
  for (const { pattern, template } of PARAMETER_ROUTES) {
    if (pattern.test(normalized)) {
      return template;
    }
  }
  return UNKNOWN_ROUTE;
}
