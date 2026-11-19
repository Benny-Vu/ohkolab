/**
 * The OG Worker for ohkolab.com — the thin fetch handler.
 *
 * Three kinds of traffic:
 *
 *  1. `/og/<type>/<id>.png` — generated preview images (image.ts).
 *  2. Crawler requests for pages (bots.ts) — the SPA's index.html with
 *     that page's Open Graph and Twitter Card tags (meta.ts, cards.ts,
 *     data.ts). HTTP 200, because the SPA route is real even when the
 *     origin's 404.html fallback serves parameter routes.
 *  3. Everyone else — passed through to GitHub Pages unchanged: same
 *     method, headers, body and response, byte for byte.
 *
 * All logic lives in the pure modules; this file only glues them to the
 * Workers runtime. The tests cover the modules, not this file.
 */

import { isCrawlerUserAgent } from "./bots";
import {
  calcCard,
  genericCard,
  homeCard,
  postCard,
  profileCard,
  teamCard,
  type OgCard,
} from "./cards";
import {
  fetchPostData,
  fetchProfile,
  fetchTeam,
  type SupabaseConfig,
} from "./data";
import { renderOgImage } from "./image";
import { buildPreviewDocument, injectPreview } from "./meta";
import {
  isPagePath,
  matchOgImage,
  matchPage,
  ogImageCacheControl,
  type PageRoute,
} from "./routing";
import { originFor, SITE_URL, type Origin, type OriginMode } from "./site";

/** The Worker's plain vars (see wrangler.toml). */
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  /**
   * How the origin is reached: "direct" (the default: same-zone fetch of
   * ohkolab.com) or "host-header" (explicit fallback; see originFor in site.ts).
   */
  ORIGIN_MODE?: OriginMode;
}

/** The anon REST access, or null when the vars are not set. */
function supabaseConfig(env: Env): SupabaseConfig | null {
  return env.SUPABASE_URL && env.SUPABASE_ANON_KEY
    ? { url: env.SUPABASE_URL, anonKey: env.SUPABASE_ANON_KEY }
    : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const image = matchOgImage(url.pathname);
    if (image) {
      const response = await renderOgImage(image, supabaseConfig(env), fetch);
      response.headers.set("Cache-Control", ogImageCacheControl(image.kind));
      return response;
    }

    // Static files (robots.txt, sitemap.xml, llms.txt, assets) always pass
    // through, even for crawlers: only app pages get a preview.
    const crawler =
      (request.method === "GET" || request.method === "HEAD") &&
      isPagePath(url.pathname) &&
      isCrawlerUserAgent(request.headers.get("user-agent"));
    if (crawler) {
      return serveCrawlerPreview(
        request,
        url,
        supabaseConfig(env),
        originFor(env.ORIGIN_MODE),
      );
    }

    return proxyToOrigin(request, url, originFor(env.ORIGIN_MODE));
  },
};

/**
 * Passes a request through to GitHub Pages unchanged. In production the
 * Pages project is a project site whose custom domain is ohkolab.com, so
 * the fetch goes to the github.io host with the Host header set to
 * ohkolab.com: Pages serves the site's content without the 301 to
 * ohkolab.com that would otherwise loop back into this Worker. In "direct"
 * mode (local dev) the live site is fetched as-is. Redirects are never
 * followed, so no origin redirect can turn into a loop either.
 */
async function proxyToOrigin(
  request: Request,
  url: URL,
  origin: Origin,
): Promise<Response> {
  const headers = new Headers(request.headers);
  if (origin.host) {
    headers.set("host", origin.host);
  }
  const method = request.method;
  const init: RequestInit = {
    method,
    headers,
    redirect: "manual",
  };
  // A body is only allowed on methods that have one.
  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
  }
  return fetch(`${origin.url}${url.pathname}${url.search}`, init);
}

/** Builds the card a crawler sees for one SPA page. */
async function buildCardForPage(
  page: PageRoute,
  url: string,
  config: SupabaseConfig | null,
): Promise<OgCard> {
  switch (page.kind) {
    case "home":
      return homeCard(url);
    case "calc":
      return calcCard(url);
    case "generic":
      return genericCard(url);
    case "profile":
      return profileCard(
        url,
        config ? await fetchProfile(config, fetch, page.id ?? "") : null,
      );
    case "team":
      return teamCard(
        url,
        config ? await fetchTeam(config, fetch, page.id ?? "") : null,
      );
    case "post":
      return postCard(
        url,
        config ? await fetchPostData(config, fetch, page.id ?? "") : null,
      );
  }
}

/**
 * Serves a crawler the SPA's index.html with the page's preview tags.
 * When the origin is unreachable, a minimal document with just the tags
 * is served instead — the preview still works.
 */
async function serveCrawlerPreview(
  request: Request,
  url: URL,
  config: SupabaseConfig | null,
  origin: Origin,
): Promise<Response> {
  const page = matchPage(url.pathname);
  const pageUrl = `${SITE_URL}${url.pathname}`;
  const card = await buildCardForPage(page, pageUrl, config);

  const html =
    (await fetchOriginIndexHtml(origin)) ?? buildPreviewDocument(card);
  const preview = injectPreview(html, card);

  return new Response(request.method === "HEAD" ? null : preview, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** Fetches the SPA's index.html from the origin, or null when it fails. */
async function fetchOriginIndexHtml(origin: Origin): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (origin.host) {
      headers.host = origin.host;
    }
    const response = await fetch(`${origin.url}/`, {
      headers,
      redirect: "manual",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}
