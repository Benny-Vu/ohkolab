import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

/**
 * The learn routes: /learn, the short explainers. The page is public and
 * needs no backend, so it routes in every build. The learn dictionary
 * loads with the route; the footer link and the tab title use the shell's
 * `footer.learn` twin, which is always present.
 */
export const learnRoutes: RouteObject[] = [
  {
    path: "learn",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/learn/learn-page"),
          ensureEnglishDomain("learn"),
        ]).then(([module]) => module)
      ).LearnPage,
    }),
  },
];
