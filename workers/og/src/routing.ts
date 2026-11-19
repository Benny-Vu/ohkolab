/**
 * URL routing and cache rules for the OG Worker.
 *
 * Pure: no fetch, no Workers APIs. Two kinds of paths are matched:
 *
 *  - `/og/<type>/<id>.png` — generated preview images (see image.ts).
 *  - everything else — a page of the SPA, classified for card building.
 */

/** The kinds of preview images the Worker generates. */
export type OgImageKind = "profile" | "team" | "post" | "calc" | "brand";

/** A request for a generated preview image. */
export interface OgImageRequest {
  kind: OgImageKind;
  /** The id from the URL: a username, a UUID or a slug. */
  id: string;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const OG_IMAGE_PATTERNS: readonly {
  kind: OgImageKind;
  pattern: RegExp;
}[] = [
  // Profiles: /og/profile/<username>.png, usernames are [a-z0-9_]{3,20}.
  { kind: "profile", pattern: /^\/og\/profile\/([a-z0-9_]{3,20})\.png$/ },
  { kind: "team", pattern: new RegExp(`^/og/team/(${UUID})\\.png$`, "i") },
  { kind: "post", pattern: new RegExp(`^/og/post/(${UUID})\\.png$`, "i") },
  // The calc card is stateless (the link's URL carries the state), so any
  // slug serves the same image.
  { kind: "calc", pattern: /^\/og\/calc\/([a-z0-9-]+)\.png$/ },
  // The fixed brand card (home and tool pages).
  { kind: "brand", pattern: /^\/og\/brand\/([a-z0-9-]+)\.png$/ },
];

/**
 * Matches `/og/<type>/<id>.png`. Returns null for every other path.
 * The id must match the shape its data lives in (username pattern, UUID),
 * so nonsense ids never reach the database.
 */
export function matchOgImage(pathname: string): OgImageRequest | null {
  for (const { kind, pattern } of OG_IMAGE_PATTERNS) {
    const match = pattern.exec(pathname);
    if (match) return { kind, id: match[1] };
  }
  return null;
}

/** The kinds of SPA pages the Worker builds cards for. */
export type PageKind =
  /** `/` — the home feed. */
  | "home"
  /** `/calc` — the damage calculator. */
  | "calc"
  /** `/teams/:teamId` — a team detail page. */
  | "team"
  /** `/u/:username` — a public profile. */
  | "profile"
  /** `/post/:postId` — a post detail page. */
  | "post"
  /** Every other path: static pages, unknown routes, non-page files. */
  | "generic";

/** A SPA page classified for card building. */
export interface PageRoute {
  kind: PageKind;
  /** The route parameter (team id, username or post id), when there is one. */
  id: string | null;
}

const TEAM_PAGE_PATTERN = new RegExp(`^/teams/(${UUID})$`, "i");
const POST_PAGE_PATTERN = new RegExp(`^/post/(${UUID})$`, "i");

/**
 * Classifies a SPA path for card building. Mirrors the app's real routes
 * (`src/app/router.tsx` and the features' `routes.tsx`): `/`, `/calc`,
 * `/teams/:teamId`, `/u/:username`, `/post/:postId`; everything else gets
 * the generic card.
 */
export function matchPage(pathname: string): PageRoute {
  if (pathname === "/" || pathname === "") return { kind: "home", id: null };
  if (pathname === "/calc") return { kind: "calc", id: null };

  const team = TEAM_PAGE_PATTERN.exec(pathname);
  if (team) return { kind: "team", id: team[1] };

  const post = POST_PAGE_PATTERN.exec(pathname);
  if (post) return { kind: "post", id: post[1] };

  const profile = /^\/u\/([a-z0-9_]{3,20})$/.exec(pathname);
  if (profile) return { kind: "profile", id: profile[1] };

  return { kind: "generic", id: null };
}

/**
 * The Cache-Control header for a generated preview image.
 *
 * Team and calc images are stable content (a public team rarely changes,
 * the calc card never does), so they cache for a day. Post and profile
 * images change with their content and can be removed at any time, so
 * they cache for an hour — the same lifetime the img.ohkolab.com worker
 * uses for post images.
 */
export function ogImageCacheControl(kind: OgImageKind): string {
  const maxAge =
    kind === "team" || kind === "calc" || kind === "brand" ? 86400 : 3600;
  return `public, max-age=${maxAge}`;
}
