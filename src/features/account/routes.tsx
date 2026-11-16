import type { RouteObject } from "react-router";

export const accountRoutes: RouteObject[] = [
  {
    path: "profile",
    lazy: async () => ({
      Component: (await import("@/features/account/profile-page")).ProfilePage,
    }),
  },
  {
    path: "login",
    lazy: async () => ({
      Component: (await import("@/features/account/login-page")).LoginPage,
    }),
  },
  {
    path: "auth/callback",
    lazy: async () => ({
      Component: (await import("@/features/account/auth-callback-page"))
        .AuthCallbackPage,
    }),
  },
  {
    path: "reset-password",
    lazy: async () => ({
      Component: (await import("@/features/account/reset-password-page"))
        .ResetPasswordPage,
    }),
  },
];
