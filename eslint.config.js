import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

const relativeImports = {
  group: ["./*", "../*"],
  message: "Import from src/ with the @/ alias.",
};
const pokemonLibraries = {
  group: ["@pkmn/*", "@smogon/*"],
  message: "Only src/data/ talks to the Pokémon libraries. Import from @/data.",
};

export default defineConfig([
  // supabase/functions is Deno code (Deno globals, URL imports) with its own
  // linter; the browser config here would fail on it. The pure _shared
  // modules are still exercised by Vitest.
  globalIgnores([
    "dist",
    ".claude",
    "supabase/functions",
    // Native project: Gradle output and copied web assets, no app source.
    "android",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [relativeImports, pokemonLibraries] },
      ],
    },
  },
  {
    files: ["src/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [relativeImports] }],
    },
  },
  {
    // Generated shadcn/ui components export variants next to components.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // The app shell is the entry chunk: importing the social barrel would
    // drag the whole social data layer into it. Shell code imports the
    // specific modules it needs instead (or, usually, nothing at all).
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Only the barrel itself; specific modules under @/lib/social/*
              // are fine for the shell (and are what it should import).
              regex: "@/lib/social$",
              message:
                "The app shell must not import the social barrel: it would pull the whole social data layer into the entry chunk. Import the specific module instead.",
            },
          ],
        },
      ],
    },
  },
  prettier,
]);
