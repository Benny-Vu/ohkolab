import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * The fixed (parameter-free) route paths declared in the features'
 * routes.tsx files, such as "terms" or "auth/callback". Read from the source
 * so new pages are picked up without a list to maintain.
 */
function staticRoutePaths(root: string): string[] {
  const featuresDir = join(root, "src", "features");
  const paths = new Set<string>();
  for (const feature of readdirSync(featuresDir)) {
    const routesFile = join(featuresDir, feature, "routes.tsx");
    if (!existsSync(routesFile)) continue;
    const source = readFileSync(routesFile, "utf8");
    for (const match of source.matchAll(/path:\s*"([^"]+)"/g)) {
      const path = match[1].replace(/^\/+|\/+$/g, "");
      if (path && !path.includes(":") && !path.includes("*")) {
        paths.add(path);
      }
    }
  }
  return [...paths];
}

/**
 * SEO files, built at deploy time: `sitemap.xml` and `robots.txt` in
 * `dist/`. The sitemap lists only the public, parameter-free routes — no
 * user content, and nothing behind a sign-in. `lastmod` is omitted: the
 * pages are shells whose content changes with the data, so a build date
 * would be misleading.
 */
const SITE_ORIGIN = "https://ohkolab.com";

/** Routes worth offering to search engines, as `staticRoutePaths` returns them ("" is the home page). */
const SITEMAP_ROUTES = new Set([
  "",
  "calc",
  "teams",
  "meta",
  "groups",
  "learn",
  "terms",
  "privacy",
  "credits",
]);

function seoFiles(): Plugin {
  let root = process.cwd();
  return {
    name: "seo-files",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    writeBundle(options) {
      if (!options.dir) return;
      const routes = staticRoutePaths(root).filter((path) =>
        SITEMAP_ROUTES.has(path),
      );
      const urls = [
        `${SITE_ORIGIN}/`,
        ...routes
          .filter((path) => path !== "")
          .map((path) => `${SITE_ORIGIN}/${path}`),
      ];
      const sitemap =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n") +
        "\n</urlset>\n";
      writeFileSync(join(options.dir, "sitemap.xml"), sitemap);
      const robots =
        "User-agent: *\n" +
        "Allow: /\n" +
        "\n" +
        `Sitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
      writeFileSync(join(options.dir, "robots.txt"), robots);
    },
  };
}

/**
 * GitHub Pages serves 404.html for unknown paths. Shipping a copy of
 * index.html under that name lets client-side routes survive a refresh, but
 * with HTTP status 404, which search engines and link checkers (Discord,
 * for one) treat as a missing page. So every fixed route also gets its own
 * copy, `<route>.html`, which Pages serves at `/<route>` with status 200.
 * Routes with parameters (`/u/:username`, `/g/:slug`, ...) still rely on
 * the 404.html fallback.
 */
function spaFallback(): Plugin {
  let root = process.cwd();
  return {
    name: "spa-fallback",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    writeBundle(options) {
      if (!options.dir) return;
      const index = join(options.dir, "index.html");
      copyFileSync(index, join(options.dir, "404.html"));
      for (const path of staticRoutePaths(root)) {
        const target = join(options.dir, `${path}.html`);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(index, target);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The telemetry config reads import.meta.env.VITE_APP_VERSION (Sentry
  // release tag). CI passes the commit SHA; locally it defaults to "dev".
  const { VITE_APP_VERSION: appVersion = "dev" } = loadEnv(
    mode,
    process.cwd(),
    "VITE_APP_VERSION",
  );
  // Source maps are uploaded to Sentry only in CI deploys, where the
  // workflow sets SENTRY_AUTH_TOKEN. Without the token the plugin stays out
  // entirely and the build is unchanged.
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

  return {
    // Served from the custom domain https://ohkolab.com/
    base: "/",
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    },
    plugins: [
      react(),
      tailwindcss(),
      spaFallback(),
      seoFiles(),
      ...(sentryAuthToken
        ? [
            sentryVitePlugin({
              // Matches VITE_APP_VERSION in deploy.yml, so events line up
              // with the uploaded source maps.
              release: { name: process.env.GITHUB_SHA ?? appVersion },
              sourcemaps: {
                // The maps must not ship to GitHub Pages.
                filesToDeleteAfterUpload: ["./dist/**/*.map"],
              },
            }),
          ]
        : []),
    ],
    build: {
      // The manifest maps source modules to their built chunks; the entry
      // size guard and the startup measurement in scripts/ read it.
      manifest: true,
      // Hidden maps: generated for the Sentry upload but without the
      // sourceMappingURL comment in the shipped bundles.
      sourcemap: "hidden",
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              // The 3.2 MB learnsets blob inside @pkmn/dex is only reached via
              // the dynamic import in Dex.learnsets.get(), so it must stay in
              // its own chunk. `includeDependenciesRecursively: false` keeps the
              // tiny helper module it shares with the dex index out of this
              // group; otherwise the pokemon-data chunk would statically import
              // the learnsets chunk and pull all 3.2 MB into every data route.
              {
                name: "learnsets",
                test: /[\\/]node_modules[\\/]@pkmn[\\/]dex[\\/]build[\\/]learnsets-[A-Z0-9]+\.mjs$/,
                includeDependenciesRecursively: false,
              },
              // The ~200 KB sprite-sheet helpers from @pkmn/img plus our thin
              // src/data/sprites wrapper. They are tiny next to the dex, so
              // routes that only show sprites (team lists, profiles) load this
              // small chunk instead of the 2.5 MB pokemon-data chunk. Must be
              // matched before pokemon-data: groups are first-match-wins.
              {
                name: "sprites",
                test: /[\\/]node_modules[\\/]@pkmn[\\/]img[\\/]|[\\/]src[\\/]data[\\/]sprites\.ts$/,
                includeDependenciesRecursively: false,
              },
              // The lazily imported Japanese names: keep them out of
              // pokemon-data so English users never download them.
              {
                name: "ja-names",
                test: /[\\/]src[\\/]data[\\/]i18n[\\/]ja-names\.json$/,
                includeDependenciesRecursively: false,
              },
              // Everything Pokémon: the dex, the calc and our src/data layer.
              // Only routes that actually need Pokémon data load this chunk.
              // Dependencies are NOT pulled in recursively: src/data imports
              // shared app modules (e.g. @/types) that the entry chunk also
              // needs, and capturing them here would make the entry statically
              // import this 2.5 MB chunk.
              {
                name: "pokemon-data",
                test: /[\\/]node_modules[\\/](@pkmn|@smogon)[\\/]|[\\/]src[\\/]data[\\/]/,
                includeDependenciesRecursively: false,
              },
              // Framework and vendor chunks keep the entry chunk small.
              {
                name: "react",
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
              {
                name: "router",
                test: /[\\/]node_modules[\\/](react-router|@remix-run)[\\/]/,
              },
              {
                name: "supabase",
                test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              },
              {
                name: "query",
                test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      environment: "jsdom",
      include: [
        "src/**/*.test.{ts,tsx}",
        "scripts/**/*.test.ts",
        // Pure modules shared by the Edge Functions: no Deno imports, so
        // Vitest can run their tests in jsdom like any other module.
        "supabase/functions/_shared/**/*.test.ts",
        // The OG Worker's pure logic (crawler detection, meta building,
        // data rules) runs here too, so `npm run check` and CI cover it.
        "workers/og/src/**/*.test.ts",
      ],
      setupFiles: ["./src/test/setup.ts"],
      passWithNoTests: true,
    },
  };
});
