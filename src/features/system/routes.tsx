import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

/**
 * System routes for the lead to mount in the router: the 404 page and the
 * route error boundary. Import the page components directly from
 * `@/features/system/not-found-page` and `@/features/system/route-error-page`.
 */
export const systemRoutes: RouteObject[] = [
  {
    path: "*",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/system/not-found-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).NotFoundPage,
    }),
  },
];
