import type { RouteObject } from "react-router";

export const homeRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => ({
      Component: (await import("@/features/home/home-page")).HomePage,
    }),
  },
];
