import type { RouteObject } from "react-router";

export const legalRoutes: RouteObject[] = [
  {
    path: "terms",
    lazy: async () => ({
      Component: (await import("@/features/legal/terms-page")).TermsPage,
    }),
  },
  {
    path: "privacy",
    lazy: async () => ({
      Component: (await import("@/features/legal/privacy-page")).PrivacyPage,
    }),
  },
];
