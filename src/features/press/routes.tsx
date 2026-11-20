import type { RouteObject } from "react-router";

/**
 * The press kit route. All of the page's strings are static content or shell
 * keys, so no feature dictionary needs to load with it.
 */
export const pressRoutes: RouteObject[] = [
  {
    path: "press",
    lazy: async () => ({
      Component: (await import("@/features/press/press-page")).PressPage,
    }),
  },
];
