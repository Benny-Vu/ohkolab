import type { RouteObject } from "react-router";

/**
 * System routes for the lead to mount in the router: the 404 page and the
 * route error boundary. Import the page components directly from
 * `@/features/system/not-found-page` and `@/features/system/route-error-page`.
 */
export const systemRoutes: RouteObject[] = [
  {
    path: "*",
    lazy: async () => ({
      Component: (await import("@/features/system/not-found-page"))
        .NotFoundPage,
    }),
  },
];
