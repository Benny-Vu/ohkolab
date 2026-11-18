/**
 * Cloudflare Worker for img.ohkolab.com.
 *
 * Serves approved post images from the public Supabase bucket
 * (post-images) through Cloudflare's cache. Plain JavaScript, no build
 * step, no dependencies: paste into the Cloudflare dashboard (see
 * README.md) and set the SUPABASE_PUBLIC_BUCKET_URL variable.
 *
 * WHY serve through Cloudflare's cache at all? Cloudflare's CSAM Scanning
 * Tool checks images as they first enter the edge cache. A DNS record or
 * Worker that hands the request straight to Supabase (or proxies without
 * caching) skips that check entirely. Forcing every image through
 * cacheEverything means every served image is scanned; the screen-image
 * Edge Function additionally pre-warms the cache right after approving an
 * image, so the scan happens before the image is shown to anyone (which
 * narrows, but does not close, the gap - see README.md).
 */

// {uid}/{post_id}/{image_id}.webp - three UUID-shaped segments, the
// bucket layout fixed by the client upload and the screening function.
// Approved paths are immutable per file, so they cache for a year.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const IMAGE_PATH_RE = new RegExp(`^${UUID}/${UUID}/${UUID}\\.webp$`, "i");

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (!env.SUPABASE_PUBLIC_BUCKET_URL) {
      return new Response("Worker misconfigured", { status: 500 });
    }
    const path = new URL(request.url).pathname.replace(/^\/+|\/+$/g, "");
    if (!IMAGE_PATH_RE.test(path)) {
      return new Response("Not found", { status: 404 });
    }

    const upstream = await fetch(`${env.SUPABASE_PUBLIC_BUCKET_URL}/${path}`, {
      // Always GET upstream; HEAD is answered from these headers with an
      // empty body below.
      method: "GET",
      cf: {
        // Cache the image in Cloudflare's edge cache (and let the CSAM
        // Scanning Tool see it), ignoring Supabase's own cache headers.
        cacheEverything: true,
        // A year per status: approved paths are immutable per file id.
        // Only 2xx is listed, so 404 and 451 are never cached - they
        // pass straight through every time.
        cacheTtlByStatus: { "200-299": 31536000 },
      },
    });

    const headers = new Headers(upstream.headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    // Non-200 statuses (404, 451) pass through untouched; 451 is how the
    // screening function learns that the CSAM Scanning Tool matched the
    // image.
    if (request.method === "HEAD") {
      return new Response(null, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
