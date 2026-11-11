import type { RouteObject } from "react-router";

export const metagameRoutes: RouteObject[] = [
  {
    path: "meta",
    lazy: async () => ({
      Component: (await import("@/features/metagame/metagame-page"))
        .MetagamePage,
    }),
  },
];
