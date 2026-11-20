/**
 * Hover/focus prefetch for the main nav destinations: the lazy route
 * chunk plus the screen's first query, so the next tap lands instantly.
 * Each destination prefetches once per session; failures are silent
 * (the navigation itself retries whatever failed).
 *
 * This module lives in src/app on purpose: it names chunks from many
 * features, so the i18n route audit must not see it as part of any one
 * feature's graph, and the entry audit must not follow its dynamic
 * imports. Pages that want a prefetch without importing this module
 * dispatch the "ohkolab:prefetch" window event (the app layout listens).
 */

import { queryClient } from "@/app/query-client";
import { getBattleFormat } from "@/lib/preferences";
import { findSnapshot } from "@/lib/metagame/snapshots";
import type { MetagameIndex } from "@/lib/metagame/types";

/** The event a page dispatches to request a destination prefetch. */
export const PREFETCH_EVENT = "ohkolab:prefetch";

// The exact modules the routes.tsx files lazy-load, so Vite hands out
// the same chunks the navigation will request.
const routeChunks: Record<string, () => Promise<unknown>> = {
  "/calc": () => import("@/features/calc/calc-page"),
  "/teams": () => import("@/features/team-builder/teams-page"),
  "/meta": () => import("@/features/metagame/metagame-page"),
  "/groups": () => import("@/features/groups/groups-page"),
};

const prefetched = new Set<string>();

/** The metagame index plus the current format's snapshot. */
async function prefetchMetagame(): Promise<void> {
  const { metagameIndexQueryOptions, metagameSnapshotQueryOptions } =
    await import("@/features/metagame/use-metagame");
  await queryClient.prefetchQuery(metagameIndexQueryOptions());
  const index = queryClient.getQueryData<MetagameIndex>(["metagame", "index"]);
  if (!index) return;
  const choice = findSnapshot(index, getBattleFormat(), null);
  if (!choice) return;
  await queryClient.prefetchQuery(
    metagameSnapshotQueryOptions(getBattleFormat(), choice.path),
  );
}

/**
 * Warms the chunk and the first query of a main destination. Safe to
 * call repeatedly (also from mouseenter and focus); it only acts once.
 */
export function prefetchDestination(path: string): void {
  if (prefetched.has(path)) return;
  prefetched.add(path);
  routeChunks[path]?.().catch(() => {});
  if (path === "/meta") {
    void prefetchMetagame().catch(() => {});
  } else if (path === "/groups") {
    void import("@/lib/groups/queries")
      .then((queries) =>
        queryClient.prefetchQuery(queries.discoverGroupsQueryOptions()),
      )
      .catch(() => {});
  }
}
