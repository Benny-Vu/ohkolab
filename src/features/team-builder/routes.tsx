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
];
