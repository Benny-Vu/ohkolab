/**
 * One-off measurement harness (not part of the app): builds a tiny entry
 * with the same chunk-splitting groups as vite.config.ts, to verify that
 * the lazily imported ja-names.json lands in its own on-demand chunk and
 * does not grow the pokemon-data chunk for English users.
 *
 *   PROBE_ENTRY=<abs path to probe-entry> npx vite build -c scripts/i18n/probe.config.ts
 *
 * The groups below mirror vite.config.ts on purpose; if this probe is
 * still around when the app config changes, update both.
 */
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("../../src", import.meta.url).pathname.slice(1),
    },
  },
  build: {
    outDir: "dist-probe",
    rolldownOptions: {
      input: {
        probe: process.env.PROBE_ENTRY as string,
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: "learnsets",
              test: /[\\/]node_modules[\\/]@pkmn[\\/]dex[\\/]build[\\/]learnsets-[A-Z0-9]+\.mjs$/,
              includeDependenciesRecursively: false,
            },
            {
              // The fix this probe verified: without this group the JSON
              // below is matched by pokemon-data and merged into it, so
              // English users download the Japanese names too.
              name: "ja-names",
              test: /[\\/]src[\\/]data[\\/]i18n[\\/]ja-names\.json$/,
              includeDependenciesRecursively: false,
            },
            {
              name: "sprites",
              test: /[\\/]node_modules[\\/]@pkmn[\\/]img[\\/]|[\\/]src[\\/]data[\\/]sprites\.ts$/,
              includeDependenciesRecursively: false,
            },
            {
              name: "pokemon-data",
              test: /[\\/]node_modules[\\/](@pkmn|@smogon)[\\/]|[\\/]src[\\/]data[\\/]/,
              includeDependenciesRecursively: false,
            },
            {
              name: "react",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
