# OG Worker (ohkolab.com link previews)

A Cloudflare Worker that sits in front of ohkolab.com and gives link-preview
crawlers (Discord, Twitter/X, Facebook, Slack, LinkedIn, Reddit, Telegram,
WhatsApp, Pinterest, Apple, Bing, Google) an Open Graph / Twitter Card
preview of the shared page. Everyone else gets the site exactly as GitHub
Pages serves it.

This package is **standalone**: it is never a dependency of the main app.
The app's build does not type-check it — run the checks below from
`workers/og/`.

## What it does

| Traffic                          | Response                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/og/<type>/<id>.png`            | A generated 1200x630 PNG preview image (workers-og).                                                                                                                        |
| Crawler User-Agent, page request | The SPA's `index.html` with that page's `og:*` and `twitter:*` tags (HTTP 200 — parameter routes are real SPA routes even when the origin's 404.html fallback serves them). |
| Everyone else                    | Pass-through to GitHub Pages, byte for byte: same method, headers, body and response.                                                                                       |

Only the User-Agent decides: the detection is a case-insensitive substring
match (see `src/bots.ts`), so crawler variants are caught and normal
browsers are never rewritten. Nothing is cloaked — crawlers get the real
index.html plus meta tags, humans get the untouched site.

### Cards per page

| Page                                    | Card                                                                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` and every tool/static page          | Fixed brand card: "OHKOLab" + the tagline + `/og/brand/ohkolab.png`.                                                                                           |
| `/calc`                                 | "Damage Calculator — OHKOLab", generic description, `/og/calc/default.png` (the URL carries the calc state; the card deliberately does not).                   |
| `/u/:username`                          | Display name + bio + avatar Pokémon in the description, image `/og/profile/<username>.png`.                                                                    |
| `/teams/:teamId`                        | Team name + the six Pokémon names, image `/og/team/<id>.png` — public teams only.                                                                              |
| `/post/:postId`                         | Author's name + first ~150 characters of the body. Image: the attached team's card image if any, else the first **approved** post image, else the brand image. |
| Anything unreadable, unknown or private | The generic brand card — it never reveals whether a post, team or profile exists.                                                                              |

### Data rules (all reads are anon-key-only, through the existing RLS)

- Posts in **invite-only groups** are invisible to the anon role (the
  `visible posts are readable` policy) — and `postCard` re-checks the
  group's visibility anyway, failing closed.
- **Pending / rejected / blocked** post images are invisible to the anon
  role (the `post_images` policy allows only `status = 'approved'`) — and
  `parseApprovedImagePath` re-checks the status anyway.
- **Private teams** are invisible to the anon role (the teams policy allows
  only `is_public`) — and `parseTeamRow` re-checks `is_public` anyway.
- If the Supabase vars are missing or a query fails, the card is generic.

### Image caching (`Cache-Control: public, max-age=…`)

- Teams, calc and brand images: `max-age=86400` (a day).
- Post and profile images: `max-age=3600` (an hour, like img.ohkolab.com,
  so removals take effect quickly).

## Layout

- `src/index.ts` — the thin fetch handler; all logic is in the pure
  modules below.
- `src/bots.ts` — crawler User-Agent detection.
- `src/routing.ts` — `/og/...` and page URL matching, cache rules.
- `src/cards.ts` — the card builders and the data rules on top of RLS.
- `src/meta.ts` — HTML escaping, OG/Twitter tag building, injection into
  index.html.
- `src/data.ts` — anon-key Supabase REST reads with validated row parsers.
- `src/templates.ts` — the image HTML template (brand palette from
  `src/index.css`).
- `src/sprites.ts` — **generated** roster-to-sprite-URL table (header
  comment explains how to regenerate). The images hotlink the same
  `play.pokemonshowdown.com` gen5 sprites the app shows.
- `src/image.ts` — workers-og glue: font loading, image rendering.
- `src/*.test.ts` — unit tests; they run in the **root** vitest suite
  (`npx vitest run workers/og` from the repo root, also part of
  `npm run check`). They are plain module imports — no Workers runtime.

## Configuration

`wrangler.toml` holds the route (`ohkolab.com/*`, zone `ohkolab.com`) and
plain vars:

- `SUPABASE_URL` — the project URL (same as `VITE_SUPABASE_URL`).
- `SUPABASE_ANON_KEY` — the **public anon key** (same as
  `VITE_SUPABASE_ANON_KEY`). Never a service_role key.

Both are set. If the project or its keys rotate, update them here and in
the GitHub Actions secrets together.

## Development

```powershell
# inside workers/og/ — install once
npm install

# type-check (the app build does NOT check this package)
npm run typecheck

# local dev server (needs no login for plain requests; Supabase reads
# go to the real project with the anon key, which is read-only-ish: RLS
# decides what it can see)
npm run dev

# from the repo root — run the worker's unit tests
npx vitest run workers/og
```

`wrangler dev` binds a local port; crawler previews can be exercised with
`curl -A Discordbot http://localhost:8787/u/<username>`.

## Deploying

> The owner does a one-time `npx wrangler login`; deploys themselves are
> done by Claude Code after that.

```powershell
# inside workers/og/
npx wrangler deploy
```

The route requires the `ohkolab.com` zone to be in the same Cloudflare
account as the Worker. DNS for ohkolab.com must be proxied (orange cloud)
for the Worker route to take effect. **Check after the first deploy** that
a plain `curl https://ohkolab.com/` still returns the site (see the origin
note below) and that `curl -A Discordbot https://ohkolab.com/` returns the
meta tags.

### How the pass-through reaches GitHub Pages

The Pages project is a _project site_ (repo `vu-forge/ohkolab`) whose
custom domain is ohkolab.com. Fetching
`https://vu-forge.github.io/ohkolab/<path>` returns a 301 to
`https://ohkolab.com/<path>` — following it would loop straight back into
the Worker. The Worker instead fetches `https://vu-forge.github.io/<path>`
with the `Host` header set to `ohkolab.com`: GitHub Pages (Fastly) serves
the site's content directly, no redirect (verified with curl). Redirects
are never followed (`redirect: "manual"`), so no origin redirect can
become a loop. If Cloudflare ever stops honouring the Host override on
subrequests, pages would come back as GitHub's 301 — that is the first
thing to check if the site breaks after a deploy.

## Known limits

- The calc card is generic on purpose: the calc's share URLs carry state in
  the URL, and the card does not try to describe it.
- The brand images are text-only (the wordmark in the brand accent). No
  logo art exists, by design.
- Post cards with an attached team use `/og/post/<id>.png` (rendered from
  the post's team snapshot): team attachments carry no team id, so there is
  no `/og/team/<id>.png` to point at.
- If the Google Fonts fetch fails, image requests answer 500 and crawlers
  show no image rather than a broken one.
