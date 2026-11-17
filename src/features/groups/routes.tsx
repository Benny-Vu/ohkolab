import type { RouteObject } from "react-router";

export const groupsRoutes: RouteObject[] = [
  {
    path: "groups",
    lazy: async () => ({
      Component: (await import("@/features/groups/groups-page")).GroupsPage,
    }),
  },
  {
    path: "groups/new",
    lazy: async () => ({
      Component: (await import("@/features/groups/new-group-page"))
        .NewGroupPage,
    }),
  },
  {
    path: "g/:slug",
    lazy: async () => ({
      Component: (await import("@/features/groups/group-page")).GroupPage,
    }),
  },
];
