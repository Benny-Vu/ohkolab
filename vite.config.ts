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
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    passWithNoTests: true,
  },
});
