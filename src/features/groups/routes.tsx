import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const groupsRoutes: RouteObject[] = [
  {
    path: "groups",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/groups/groups-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("tools"),
        ]).then(([module]) => module)
      ).GroupsPage,
    }),
  },
  {
    path: "groups/new",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/groups/new-group-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("tools"),
        ]).then(([module]) => module)
      ).NewGroupPage,
    }),
  },
  {
    path: "g/:slug",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/groups/group-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("tools"),
        ]).then(([module]) => module)
      ).GroupPage,
    }),
  },
];
