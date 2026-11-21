import { useQuery } from "@tanstack/react-query";

import { parseTopTeamsFile } from "@/lib/top-teams/parse";
import type { TopTeamsFile } from "@/lib/top-teams/types";

const TOP_TEAMS_PATH = "/data/top-teams/teams.json";

/**
 * The committed snapshot is regenerated at most weekly and never changes
 * in place, so the browser cache and a day of staleTime carry it.
 */
const TOP_TEAMS_STALE_TIME = 24 * 60 * 60 * 1000;

/** The top-teams query options, shared by the hook and the nav prefetch. */
export function topTeamsQueryOptions() {
  return {
    queryKey: ["top-teams", "file"] as const,
    queryFn: async (): Promise<TopTeamsFile> => {
      const response = await fetch(TOP_TEAMS_PATH);
      if (!response.ok) {
        throw new Error(`Failed to load ${TOP_TEAMS_PATH}: ${response.status}`);
      }
      const parsed = parseTopTeamsFile(await response.json());
      if (!parsed) {
        throw new Error("Invalid top-teams file");
      }
      return parsed;
    },
    staleTime: TOP_TEAMS_STALE_TIME,
  };
}

/** Loads and validates the committed top-teams snapshot. */
export function useTopTeams() {
  return useQuery(topTeamsQueryOptions());
}
