import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const teamBuilderRoutes: RouteObject[] = [
  {
    path: "teams",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/team-builder/teams-page"),
          ensureEnglishDomain("tools"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).TeamsPage,
    }),
  },
  {
    path: "teams/:teamId",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/team-builder/team-detail-page"),
          ensureEnglishDomain("tools"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).TeamDetailPage,
    }),
  },
  {
    path: "teams/:teamId/print",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/team-builder/team-print-page"),
          ensureEnglishDomain("tools"),
          // The sheet's "6 Pokémon" line lives in the account strings.
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).TeamPrintPage,
    }),
  },
];
