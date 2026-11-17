import type { RouteObject } from "react-router";

export const postRoutes: RouteObject[] = [
  {
    path: "post/:postId",
    lazy: async () => ({
      Component: (await import("@/features/post/post-detail-page"))
        .PostDetailPage,
    }),
  },
];
