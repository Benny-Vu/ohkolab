import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";
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
export default defineConfig({
  // Served from the custom domain https://ohkolab.com/
  base: "/",
  plugins: [react(), tailwindcss(), spaFallback()],
  build: {
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
});
