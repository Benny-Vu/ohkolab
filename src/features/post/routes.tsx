import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const postRoutes: RouteObject[] = [
  {
    path: "post/:postId",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/post/post-detail-page"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("tools"),
          ensureEnglishDomain("account"),
        ]).then(([module]) => module)
      ).PostDetailPage,
    }),
  },
];
