import type { RouteObject } from "react-router";

/**
 * Source-link routes for the lead to mount in the router: the marketing
 * landing paths `/from/tiktok` and friends. They record one event and
 * redirect home, so the page renders nothing and needs no i18n domain.
 */
export const sourceRoutes: RouteObject[] = [
  {
    path: "/from/:source",
    lazy: async () => {
      const module =
        await import("@/features/source-links/source-redirect-page");
      return { Component: module.SourceRedirectPage };
    },
  },
];
