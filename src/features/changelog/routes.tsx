import type { RouteObject } from "react-router";

/**
 * The changelog routes: /changelog, the public "What's new" page. It is
 * public and needs no backend, so it routes in every build; the strings
 * it uses come from the shell dictionary (always loaded) and the entries
 * carry their own English and Japanese lines.
 */
export const changelogRoutes: RouteObject[] = [
  {
    path: "changelog",
    lazy: async () => ({
      Component: (await import("@/features/changelog/changelog-page"))
        .ChangelogPage,
    }),
  },
];
