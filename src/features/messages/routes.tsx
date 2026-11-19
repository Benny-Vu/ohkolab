import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";
import { directMessagesEnabled } from "@/lib/messages/flag";

/**
 * The direct message routes. The array is empty while VITE_DIRECT_MESSAGES
 * is off, so nothing mounts and no route exists; the lead wires it into
 * `src/app/router.tsx` after merging.
 */
export const messagesRoutes: RouteObject[] = directMessagesEnabled()
  ? [
      {
        path: "messages",
        lazy: async () => ({
          Component: (
            await Promise.all([
              import("@/features/messages/messages-page"),
              ensureEnglishDomain("community"),
            ]).then(([module]) => module)
          ).MessagesPage,
        }),
      },
      {
        path: "messages/:id",
        lazy: async () => ({
          Component: (
            await Promise.all([
              import("@/features/messages/thread-page"),
              ensureEnglishDomain("community"),
            ]).then(([module]) => module)
          ).ThreadPage,
        }),
      },
    ]
  : [];
