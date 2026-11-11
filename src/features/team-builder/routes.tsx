import type { RouteObject } from "react-router";

export const teamBuilderRoutes: RouteObject[] = [
  {
    path: "teams",
    lazy: async () => ({
      Component: (await import("@/features/team-builder/teams-page")).TeamsPage,
    }),
  },
];
