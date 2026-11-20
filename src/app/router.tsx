import { createBrowserRouter } from "react-router";

import { AppLayout } from "@/app/app-layout";
import { PageLoading } from "@/app/route-pages";
import { accountRoutes } from "@/features/account/routes";
import { adminRoutes } from "@/features/admin/routes";
import { calcRoutes } from "@/features/calc/routes";
import { creditsRoutes } from "@/features/credits/routes";
import { feedbackRoutes } from "@/features/feedback/routes";
import { groupsRoutes } from "@/features/groups/routes";
import { homeRoutes } from "@/features/home/routes";
import { legalRoutes } from "@/features/legal/routes";
import { messagesRoutes } from "@/features/messages/routes";
import { metagameRoutes } from "@/features/metagame/routes";
import { moderationRoutes } from "@/features/moderation/routes";
import { notificationRoutes } from "@/features/notifications/routes";
import { postRoutes } from "@/features/post/routes";
import { pressRoutes } from "@/features/press/routes";
import { profileRoutes } from "@/features/profile/routes";
import { sourceRoutes } from "@/features/source-links/routes";
import { styleguideRoutes } from "@/features/styleguide/routes";
import { RouteErrorPage } from "@/features/system/route-error-page";
import { systemRoutes } from "@/features/system/routes";
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
        errorElement: <RouteErrorPage />,
        children: [
          ...homeRoutes,
          ...legalRoutes,
          ...creditsRoutes,
          ...pressRoutes,
          ...calcRoutes,
          ...teamBuilderRoutes,
          ...metagameRoutes,
          ...accountRoutes,
          ...adminRoutes,
          ...feedbackRoutes,
          ...postRoutes,
          ...profileRoutes,
          ...messagesRoutes,
          ...notificationRoutes,
          ...moderationRoutes,
          ...groupsRoutes,
          ...sourceRoutes,
          ...styleguideRoutes,
          ...systemRoutes,
        ],
      },
    ],
  },
]);
