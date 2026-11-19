import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const feedbackRoutes: RouteObject[] = [
  {
    path: "admin/feedback",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/feedback/admin-feedback-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).AdminFeedbackPage,
    }),
  },
];
