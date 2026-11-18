import { createBrowserRouter } from "react-router";

import { AppLayout } from "@/app/app-layout";
import { NotFoundPage, PageLoading, RouteError } from "@/app/route-pages";
import { accountRoutes } from "@/features/account/routes";
import { adminRoutes } from "@/features/admin/routes";
import { calcRoutes } from "@/features/calc/routes";
import { feedbackRoutes } from "@/features/feedback/routes";
import { groupsRoutes } from "@/features/groups/routes";
import { homeRoutes } from "@/features/home/routes";
import { legalRoutes } from "@/features/legal/routes";
import { metagameRoutes } from "@/features/metagame/routes";
import { moderationRoutes } from "@/features/moderation/routes";
import { notificationRoutes } from "@/features/notifications/routes";
import { postRoutes } from "@/features/post/routes";
import { profileRoutes } from "@/features/profile/routes";
import { styleguideRoutes } from "@/features/styleguide/routes";
import { teamBuilderRoutes } from "@/features/team-builder/routes";

/**
 * Each feature owns its own `routes.tsx` and adds pages there; this file only
 * stitches the features into the shared layout.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        // The fallback lives here, below the shell route, so the header and
        // tab bar stay mounted while the first lazy page hydrates.
        hydrateFallbackElement: <PageLoading />,
        errorElement: <RouteError />,
        children: [
          ...homeRoutes,
          ...legalRoutes,
          ...calcRoutes,
          ...teamBuilderRoutes,
          ...metagameRoutes,
          ...accountRoutes,
          ...adminRoutes,
          ...feedbackRoutes,
          ...postRoutes,
          ...profileRoutes,
          ...notificationRoutes,
          ...moderationRoutes,
          ...groupsRoutes,
          ...styleguideRoutes,
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
