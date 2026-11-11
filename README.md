# OHKOLab

OHKOLab is an unofficial utility tool for Pokémon Champions: damage calculation, team building and more.

Built with React, TypeScript and Vite. Pokémon data comes from `@pkmn/dex` / `@pkmn/data`, and damage calculation from `@smogon/calc`, which includes Champions mechanics.

## Getting started

```bash
npm install
npm run dev      # start the dev server
```

## Scripts

| Command                | What it does                           |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | Dev server with hot reload             |
| `npm run build`        | Type-check, then build to `dist/`      |
| `npm run preview`      | Serve the production build locally     |
| `npm run lint`         | Run ESLint                             |
| `npm run format`       | Format with Prettier                   |
| `npm run format:check` | Check formatting without changing code |

## Project notes

- Import from `src/` with the `@/` alias, e.g. `import { x } from "@/lib/x"`.
- The app is built with `base: "/Pokemon-Champions-Utility-Tool/"` for GitHub Pages.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Disclaimer

OHKOLab is an unofficial fan project. It is not affiliated with or endorsed by Nintendo, Game Freak, Creatures or The Pokémon Company. Pokémon and Pokémon character names are trademarks of their respective owners.
