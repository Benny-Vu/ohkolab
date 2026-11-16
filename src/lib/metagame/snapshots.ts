import type { BattleFormat } from "@/types/battle";
import type { MetagameIndex } from "@/lib/metagame/types";

export interface SnapshotChoice {
  period: string;
  regulation: string;
  path: string;
}

/** Ensure a data path is root-relative so `fetch` works under any base. */
export function normalizeDataPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** All snapshots for a format, newest period first. */
export function listSnapshots(
  index: MetagameIndex,
  format: BattleFormat,
): SnapshotChoice[] {
  return index.snapshots
    .filter((snapshot) => snapshot.format === format)
    .sort((a, b) => (a.period < b.period ? 1 : a.period > b.period ? -1 : 0))
    .map(({ period, regulation, path }) => ({ period, regulation, path }));
}

/**
 * The snapshot for a period, or the latest when period is null. Prefers the
 * index's `latest` path when it matches a listed snapshot.
 */
export function findSnapshot(
  index: MetagameIndex,
  format: BattleFormat,
  period: string | null,
): SnapshotChoice | null {
  const snapshots = listSnapshots(index, format);
  if (snapshots.length === 0) return null;
  if (period !== null) {
    return snapshots.find((snapshot) => snapshot.period === period) ?? null;
  }
  const latest = index.latest[format];
  return (
    snapshots.find((snapshot) => snapshot.path === latest) ??
    snapshots[0] ??
    null
  );
}
