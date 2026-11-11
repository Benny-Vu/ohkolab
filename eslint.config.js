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
  globalIgnores(["dist", ".claude"]),
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
  prettier,
]);
