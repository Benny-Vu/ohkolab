import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * GitHub Pages serves 404.html for unknown paths. Shipping a copy of
 * index.html under that name lets client-side routes survive a refresh.
 */
function spaFallback(): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    writeBundle(options) {
      if (!options.dir) return;
      copyFileSync(
        join(options.dir, "index.html"),
        join(options.dir, "404.html"),
      );
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
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
      setupFiles: ["./src/test/setup.ts"],
      passWithNoTests: true,
    },
  };
});
