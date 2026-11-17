import type { RouteObject } from "react-router";

export const notificationRoutes: RouteObject[] = [
  {
    path: "notifications",
    lazy: async () => ({
      Component: (await import("@/features/notifications/notifications-page"))
        .NotificationsPage,
    }),
  },
];
