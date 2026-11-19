import type { RouteObject } from "react-router";

/**
 * The credits route. All of the page's strings are static content or shell
 * keys, so no feature dictionary needs to load with it.
 */
export const creditsRoutes: RouteObject[] = [
  {
    path: "credits",
    lazy: async () => ({
      Component: (await import("@/features/credits/credits-page")).CreditsPage,
    }),
  },
];
