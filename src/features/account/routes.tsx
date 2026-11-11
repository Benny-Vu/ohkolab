import type { RouteObject } from "react-router";

export const accountRoutes: RouteObject[] = [
  {
    path: "profile",
    lazy: async () => ({
      Component: (await import("@/features/account/profile-page")).ProfilePage,
    }),
  },
];
