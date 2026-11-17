import { useQuery } from "@tanstack/react-query";

import type { BattleFormat } from "@/types/battle";
import { findSnapshot, normalizeDataPath } from "@/lib/metagame/snapshots";
import {
  parseMetagameIndex,
  parseMetagameSnapshot,
} from "@/lib/metagame/parse";
import type { MetagameIndex, MetagameSnapshot } from "@/lib/metagame/types";

const INDEX_PATH = "/data/metagame/index.json";

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

/** Loads and validates the metagame index. */
export function useMetagameIndex() {
  return useQuery({
    queryKey: ["metagame", "index"],
    queryFn: async (): Promise<MetagameIndex> => {
      const parsed = parseMetagameIndex(await fetchJson(INDEX_PATH));
      if (!parsed) {
        throw new Error("Invalid metagame index file");
      }
      return parsed;
    },
  });
}

/** Loads and validates the snapshot for a format and period (null = latest). */
export function useMetagameSnapshot(
  format: BattleFormat,
  period: string | null,
) {
  const index = useMetagameIndex();
  const choice = index.data ? findSnapshot(index.data, format, period) : null;
  return useQuery({
    queryKey: ["metagame", "snapshot", format, choice?.path],
    enabled: choice !== null,
    queryFn: async (): Promise<MetagameSnapshot> => {
      if (!choice) throw new Error("No snapshot for this format");
      const parsed = parseMetagameSnapshot(
        await fetchJson(normalizeDataPath(choice.path)),
      );
      if (!parsed) {
        throw new Error(`Invalid metagame snapshot file: ${choice.path}`);
      }
      return parsed;
    },
  });
}
