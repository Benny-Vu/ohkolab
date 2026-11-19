import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const profileRoutes: RouteObject[] = [
  {
    path: "u/:username",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/profile/public-profile-page"),
          ensureEnglishDomain("account"),
          ensureEnglishDomain("community"),
          ensureEnglishDomain("tools"),
        ]).then(([module]) => module)
      ).PublicProfilePage,
    }),
  },
];
