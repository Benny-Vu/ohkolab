import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const legalRoutes: RouteObject[] = [
  {
    path: "terms",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/legal/terms-page"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).TermsPage,
    }),
  },
  {
    path: "privacy",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/legal/privacy-page"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).PrivacyPage,
    }),
  },
  {
    path: "delete-account",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/legal/delete-account-page"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).DeleteAccountPage,
    }),
  },
];
