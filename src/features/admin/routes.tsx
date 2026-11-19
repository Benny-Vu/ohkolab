import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const adminRoutes: RouteObject[] = [
  {
    path: "admin/reports",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/admin/admin-reports-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).AdminReportsPage,
    }),
  },
  {
    path: "admin/appeals",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/admin/admin-appeals-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).AdminAppealsPage,
    }),
  },
];
