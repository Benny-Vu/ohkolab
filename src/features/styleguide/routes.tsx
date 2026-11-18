import type { RouteObject } from "react-router";

/**
 * The styleguide is a dev-only page: it renders every token and component so
 * the design can be audited at any width. It is excluded from production
 * builds because the whole route is dropped when DEV is false.
 */
export const styleguideRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: "dev/styleguide",
        lazy: async () => ({
          Component: (await import("@/features/styleguide/styleguide-page"))
            .StyleguidePage,
        }),
      },
    ]
  : [];
