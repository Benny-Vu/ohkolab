import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";
import { battlesEnabled } from "@/lib/battles/flag";

/**
 * The battle board routes. The array is empty while VITE_BATTLES is off, so
 * nothing mounts and no route exists; the lead wires it into
 * `src/app/router.tsx` after merging.
 *
 * The board pages borrow keys from the community domain (the report reasons
 * and toasts) and the tools domain (the team preview's aria label), so both
 * load with the route alongside the battles domain itself.
 */
export const battleRoutes: RouteObject[] = battlesEnabled()
  ? [
      {
        path: "battles",
        lazy: async () => ({
          Component: (
            await Promise.all([
              import("@/features/battles/board/battle-board-page"),
              ensureEnglishDomain("battles"),
              ensureEnglishDomain("community"),
              ensureEnglishDomain("tools"),
            ]).then(([module]) => module)
          ).BattleBoardPage,
        }),
      },
    ]
  : [];
