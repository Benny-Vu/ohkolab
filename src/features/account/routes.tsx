import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

export const accountRoutes: RouteObject[] = [
  {
    path: "profile",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/account/profile-page"),
          ensureEnglishDomain("account"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).ProfilePage,
    }),
  },
  {
    path: "login",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/account/login-page"),
          ensureEnglishDomain("account"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).LoginPage,
    }),
  },
  {
    path: "auth/callback",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/account/auth-callback-page"),
          ensureEnglishDomain("account"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).AuthCallbackPage,
    }),
  },
  {
    path: "reset-password",
    lazy: async () => ({
      Component: (
        await Promise.all([
          import("@/features/account/reset-password-page"),
          ensureEnglishDomain("account"),
          ensureEnglishDomain("community"),
        ]).then(([module]) => module)
      ).ResetPasswordPage,
    }),
  },
];
