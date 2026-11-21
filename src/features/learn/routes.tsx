import type { RouteObject } from "react-router";

import { ensureEnglishDomain } from "@/lib/i18n/en-loader";

/**
 * The learn routes: the hub, the four section pages and a guide page per
 * long registry entry (`/learn/<slug>`). Everything is public and needs
 * no backend. The learn dictionary loads with each route; the footer
 * link and the hub's tab title use the shell's `footer.learn` twin, which
 * is always present. Importing any page module registers the learn route
 * metadata provider (in `guides.ts`), so tab titles and descriptions
 * come from the registry in the active locale.
 */
export const learnRoutes: RouteObject[] = [
  {
    path: "learn",
    lazy: async () => {
      const [page] = await Promise.all([
        import("@/features/learn/hub-page"),
        ensureEnglishDomain("learn"),
      ]);
      return { Component: page.LearnHubPage };
    },
  },
  {
    path: "learn/vocabulary",
    lazy: async () => {
      const [page] = await Promise.all([
        import("@/features/learn/vocabulary-page"),
        ensureEnglishDomain("learn"),
      ]);
      return { Component: page.VocabularyPage };
    },
  },
  {
    path: "learn/concepts",
    lazy: async () => {
      const [page] = await Promise.all([
        import("@/features/learn/section-page"),
        ensureEnglishDomain("learn"),
      ]);
      return { Component: page.ConceptsPage };
    },
  },
  {
    path: "learn/types",
    lazy: async () => {
      const [page] = await Promise.all([
        import("@/features/learn/types/types-page"),
        ensureEnglishDomain("learn"),
      ]);
      return { Component: page.TypesPage };
    },
  },
  {
    path: "learn/field",
    lazy: async () => {
      const [page] = await Promise.all([
        import("@/features/learn/section-page"),
        ensureEnglishDomain("learn"),
      ]);
      return { Component: page.FieldPage };
    },
  },
  {
    path: "learn/:slug",
    lazy: async () => {
      // The guide page also renders the system not-found page for
      // unknown slugs, which uses community and account strings.
      const [page] = await Promise.all([
        import("@/features/learn/guide-page"),
        ensureEnglishDomain("learn"),
        ensureEnglishDomain("community"),
        ensureEnglishDomain("account"),
      ]);
      return { Component: page.GuidePage };
    },
  },
];
