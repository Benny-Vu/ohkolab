import type { RouteObject } from "react-router";

export const feedbackRoutes: RouteObject[] = [
  {
    path: "admin/feedback",
    lazy: async () => ({
      Component: (await import("@/features/feedback/admin-feedback-page"))
        .AdminFeedbackPage,
    }),
  },
];
