import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const metagameRoutes: RouteObject[] = [
  {
    path: "meta",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/metagame/metagame-page"),
          ensureEnglishDomain("tools"),
        ]).then(([module]) => module)
      ).MetagamePage,
    }),
  },
];
