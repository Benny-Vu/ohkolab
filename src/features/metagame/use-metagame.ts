import { useQuery } from "@tanstack/react-query";

import type { BattleFormat } from "@/types/battle";
import { findSnapshot, normalizeDataPath } from "@/lib/metagame/snapshots";
import {
  parseMetagameIndex,
  parseMetagameSnapshot,
} from "@/lib/metagame/parse";
import type { MetagameIndex, MetagameSnapshot } from "@/lib/metagame/types";

const INDEX_PATH = "/data/metagame/index.json";

/**
 * The committed JSON is regenerated at most monthly and never changes
 * in place, so the browser cache and a day of staleTime carry it.
 */
const METAGAME_STALE_TIME = 24 * 60 * 60 * 1000;

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

/** The index query options, shared by the hook and the nav prefetch. */
export function metagameIndexQueryOptions() {
  return {
    queryKey: ["metagame", "index"] as const,
    queryFn: async (): Promise<MetagameIndex> => {
      const parsed = parseMetagameIndex(await fetchJson(INDEX_PATH));
      if (!parsed) {
        throw new Error("Invalid metagame index file");
      }
      return parsed;
    },
    staleTime: METAGAME_STALE_TIME,
  };
}

/** The snapshot options for one committed JSON path. */
export function metagameSnapshotQueryOptions(
  format: BattleFormat,
  path: string,
) {
  return {
    queryKey: ["metagame", "snapshot", format, path] as const,
    queryFn: async (): Promise<MetagameSnapshot> => {
      const parsed = parseMetagameSnapshot(
        await fetchJson(normalizeDataPath(path)),
      );
      if (!parsed) {
        throw new Error(`Invalid metagame snapshot file: ${path}`);
      }
      return parsed;
    },
    staleTime: METAGAME_STALE_TIME,
  };
}

/** Loads and validates the metagame index. */
export function useMetagameIndex() {
  return useQuery(metagameIndexQueryOptions());
}

/** Loads and validates the snapshot for a format and period (null = latest). */
export function useMetagameSnapshot(
  format: BattleFormat,
  period: string | null,
) {
  const index = useMetagameIndex();
  const choice = index.data ? findSnapshot(index.data, format, period) : null;
  return useQuery({
    ...metagameSnapshotQueryOptions(format, choice?.path ?? ""),
    enabled: choice !== null,
  });
}
