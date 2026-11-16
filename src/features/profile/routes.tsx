import type { RouteObject } from "react-router";

export const profileRoutes: RouteObject[] = [
  {
    path: "u/:username",
    lazy: async () => ({
      Component: (await import("@/features/profile/public-profile-page"))
        .PublicProfilePage,
    }),
  },
];
