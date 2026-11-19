/**
 * Fixed site facts for the OG Worker: where the SPA lives, where post images
 * are served from, and the brand palette.
 *
 * Brand colours are the dark-theme design tokens from the app's
 * `src/index.css` (Wave 5 redesign): page #0B0D10, panel #13161B, hairline
 * #252A32, foreground #F2F4F7, muted #98A1AD and the lime brand accent
 * #C8F031 (`--accent-brand`).
 */

/** The site the Worker serves (also the origin's custom domain). */
export const SITE_URL = "https://ohkolab.com";

/**
 * The GitHub Pages host that serves ohkolab.com. The Pages project is a
 * project site (repo vu-forge/ohkolab), so `https://vu-forge.github.io/<path>`
 * 301-redirects to `https://ohkolab.com/<path>` — a fetch that follows the
 * redirect would loop straight back into this Worker. Requests are therefore
 * sent to the github.io host with the `Host` header set to `ohkolab.com`,
 * which GitHub Pages (Fastly) routes to the site's content without a
 * redirect (see README.md).
 */
export const ORIGIN_URL = "https://vu-forge.github.io";

/** The Host header that makes the origin serve the ohkolab.com site. */
export const ORIGIN_HOST = "ohkolab.com";

/** Approved post images are served from this CDN host (see workers/img). */
export const IMAGE_CDN_BASE = "https://img.ohkolab.com";

/** The site's tagline, from index.html's description meta. */
export const TAGLINE =
  "Damage calculator, team builder and community for Pokémon Champions. Unofficial fan project.";

/** The site name used in cards. */
export const SITE_NAME = "OHKOLab";

/** Dark-theme design tokens (see the header comment). */
export const BRAND = {
  page: "#0B0D10",
  panel: "#13161B",
  border: "#252A32",
  foreground: "#F2F4F7",
  muted: "#98A1AD",
  accent: "#C8F031",
} as const;
