import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const moderationRoutes: RouteObject[] = [
  {
    path: "moderation/:actionId",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/moderation/moderation-notice-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).ModerationNoticePage,
    }),
  },
];
