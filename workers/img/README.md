# img.ohkolab.com Worker

A Cloudflare Worker that serves approved post images from the public
Supabase bucket `post-images` at `https://img.ohkolab.com/<path>`, through
Cloudflare's cache. Plain JavaScript, no build step, no dependencies.

This is the owner's runbook: the deploy and the Cloudflare settings below
are done by hand (with the Claude reviewer), from the Cloudflare dashboard.

## Why this Worker exists

The app could point `img.ohkolab.com` straight at Supabase with a DNS
record and skip the Worker entirely. It must not, for one reason:
**Cloudflare's CSAM Scanning Tool checks images as they first enter
Cloudflare's edge cache.** A request that goes straight to Supabase (or a
Worker that proxies without caching) never puts the image into the cache,
so the tool never sees it.

The Worker forces every image through the cache (`cacheEverything`), so
every image is scanned before it is served from the edge. On top of that,
the `screen-image` Supabase Edge Function fetches each freshly approved
image once through this Worker right after approving it, which fills the
cache (and triggers the scan) **before** the image is shown to anyone
else. That pre-warm narrows the gap, but does not close it: the scan
happens as the image enters the cache, so the very first fetch (the
screening function's own warm-up) is what gets checked. If Cloudflare's
tool matches the image against known abuse material, later requests -
and, in the normal case, the warm-up fetch itself - return **HTTP 451**,
which the Worker passes through untouched. The screening function treats a
451 as "blocked": the image is pulled out of the public bucket, the file
is quarantined, and every admin is notified. From there the owner follows
the written CSAM procedure (disable the account, lock the evidence,
report to the police).

## Deploying (Cloudflare dashboard)

1. **Create the Worker.** Dashboard → Workers & Pages → Create → Worker,
   name it (e.g. `img`), Deploy. Then Edit code: paste `index.js` from
   this folder, Deploy again. (Or use "Quick edit" on an existing worker.)
   There is nothing to install or build.

2. **Set the bucket URL variable.** On the Worker → Settings → Variables
   and Secrets, add a plain-text variable:

   ```
   SUPABASE_PUBLIC_BUCKET_URL = https://jzpyoyjnhuokprsdoiqf.supabase.co/storage/v1/object/public/post-images
   ```

   The project ref is kept out of the code on purpose; only this variable
   knows it. (If the Supabase project ever moves, this is the one value to
   change.)

3. **Attach the domain.** On the Worker → Settings → Domains & Routes →
   Add → Custom domain: `img.ohkolab.com`. The dashboard creates the
   proxied DNS record for the `img` subdomain automatically (a checkmark
   "DNS record" is part of the flow). If you prefer doing it by hand:
   DNS → add an `A` record for `img` with any address (e.g. `192.0.2.1`),
   **Proxied** (orange cloud), then add the route `img.ohkolab.com/*` to
   the Worker under Domains & Routes → Add → Route. The subdomain must be
   proxied - an unproxied record would bypass both the Worker and the
   CSAM scanning.

4. **Check it.** `https://img.ohkolab.com/` must return 404 (it only serves
   `{uid}/{post_id}/{image_id}.webp` paths), and an approved image URL
   must return the image with a `cache-control: public, max-age=3600` header.

## Switching on the CSAM Scanning Tool

The tool is free and runs at Cloudflare's edge; it compares cached images
against hashes of known abuse material and blocks matches (HTTP 451).
Since February 2025 it needs **no NCMEC account** - an email verification
is enough.

1. In the Cloudflare dashboard, open **Trust & Safety → CSAM Scanning
   Tool** (account level, not per-site; the menu has moved around, so if
   it is not there, search the dashboard for "Scanning Tool").
2. Enable it, confirm the verification email sent to the account owner
   (vuforge@gmail.com), and make sure the `ohkolab.com` zone is included.
3. That is all: images are now scanned as they enter the cache. There is
   no report to configure per-image - a match blocks the content at the
   edge (451), and the screening function handles the rest on our side.

## Notes

- Only `GET` and `HEAD` are answered (everything else: 405), and only
  paths shaped `{uid}/{post_id}/{image_id}.webp` (three UUIDs, `.webp`).
  Everything else is 404.
- Upstream statuses (404, 451) pass through untouched, and non-2xx is
  never cached, so a blocked image cannot get stuck in the edge cache as
  a 200.
- Images are cached for one hour (`max-age=3600`, and the same edge TTL), not
  longer: an approved file never changes, but a moderator can remove it, and a
  removed image must stop being served within about an hour. cleanup-images
  runs every 15 minutes and moves removed files out of the public bucket.
- The Supabase bucket itself stays public - that is what makes the
  upstream URL work - but the app always renders `img.ohkolab.com` URLs,
  so every human request goes through the scanned edge cache.
