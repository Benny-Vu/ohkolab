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
          // The battle rows render one line from the battles dictionary.
          ensureEnglishDomain("battles"),
        ]).then(([module]) => module)
      ).NotificationsPage,
    }),
  },
];
