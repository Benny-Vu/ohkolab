import type { RouteObject } from "react-router";

export const adminRoutes: RouteObject[] = [
  {
    path: "admin/reports",
    lazy: async () => ({
      Component: (await import("@/features/admin/admin-reports-page"))
        .AdminReportsPage,
    }),
  },
  {
    path: "admin/appeals",
    lazy: async () => ({
      Component: (await import("@/features/admin/admin-appeals-page"))
        .AdminAppealsPage,
    }),
  },
];
