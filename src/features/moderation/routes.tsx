import type { RouteObject } from "react-router";

export const moderationRoutes: RouteObject[] = [
  {
    path: "moderation/:actionId",
    lazy: async () => ({
      Component: (await import("@/features/moderation/moderation-notice-page"))
        .ModerationNoticePage,
    }),
  },
];
