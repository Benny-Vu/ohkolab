import { redirect, type RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

/**
 * Battle notes live at `/notes` (they are their own thing, not a child of
 * battle mode); the old `/calc/battle/notes` link redirects there so
 * bookmarks and shared links keep working.
 */
export const battleModeRoutes: RouteObject[] = [
  {
    path: "notes",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/battle/notes-page"),
          ensureEnglishDomain("tools"),
        ]).then(([module]) => module)
      ).NotesPage,
    }),
  },
  {
    path: "calc/battle",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/battle/battle-page"),
          // The page's own strings sit in the tools domain with the
          // calculator's; the DataBadge's relative times are community's.
          ensureEnglishDomain("tools"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).BattlePage,
    }),
  },
  {
    path: "calc/battle/notes",
    loader: () => redirect("/notes"),
  },
];
