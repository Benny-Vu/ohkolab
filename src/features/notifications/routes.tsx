import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const notificationRoutes: RouteObject[] = [
  {
    path: "notifications",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/notifications/notifications-page"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).NotificationsPage,
    }),
  },
];
