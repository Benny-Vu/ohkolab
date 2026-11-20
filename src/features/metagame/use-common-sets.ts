import { useMemo } from "react";

import type { BattleFormat } from "@/types/battle";
import { topCommonSets, type CommonSet } from "@/lib/metagame/common-sets";
import type { MetagameSnapshot } from "@/lib/metagame/types";
import { useMetagameSnapshot } from "@/features/metagame/use-metagame";

/** What a picker needs to offer a species' common sets. */
export interface CommonSetsResult {
  /** The species' top sets, most common first; empty while unknown. */
  sets: CommonSet[];
  /** The snapshot's regulation (e.g. "M-C"), once loaded. */
  regulation: string | null;
  /** True while the usage snapshot is still loading. */
  isPending: boolean;
}

function findEntry(snapshot: MetagameSnapshot | undefined, species: string) {
  if (!snapshot || species === "") return null;
  return snapshot.pokemon.find((entry) => entry.species === species) ?? null;
}

/**
 * A species' most common sets from the current usage snapshot for the
 * given format. Shares the snapshot query with the metagame page, so
 * picking sets in the calc or battle mode never re-downloads data.
 */
export function useCommonSets(
  species: string,
  format: BattleFormat,
  count = 3,
): CommonSetsResult {
  const snapshot = useMetagameSnapshot(format, null);
  const sets = useMemo(
    () => topCommonSets(findEntry(snapshot.data, species), count),
    [snapshot.data, species, count],
  );
  return {
    sets,
    regulation: snapshot.data?.regulation ?? null,
    isPending: snapshot.isPending,
  };
}
