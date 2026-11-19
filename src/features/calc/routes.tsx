import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const calcRoutes: RouteObject[] = [
  {
    path: "calc",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/calc/calc-page"),
          ensureEnglishDomain("tools"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).CalcPage,
    }),
  },
];
