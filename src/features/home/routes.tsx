import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const homeRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/home/home-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("tools"),
        ]).then(([module]) => module)
      ).HomePage,
    }),
  },
];
