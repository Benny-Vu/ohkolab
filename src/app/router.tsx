import { createBrowserRouter } from "react-router";

import { AppLayout } from "@/app/app-layout";
import { NotFoundPage, PageLoading, RouteError } from "@/app/route-pages";
import { accountRoutes } from "@/features/account/routes";
import { calcRoutes } from "@/features/calc/routes";
import { homeRoutes } from "@/features/home/routes";
import { metagameRoutes } from "@/features/metagame/routes";
import { teamBuilderRoutes } from "@/features/team-builder/routes";

/**
 * Each feature owns its own `routes.tsx` and adds pages there; this file only
 * stitches the features into the shared layout.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    hydrateFallbackElement: <PageLoading />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          ...homeRoutes,
          ...calcRoutes,
          ...teamBuilderRoutes,
          ...metagameRoutes,
          ...accountRoutes,
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
