/**
 * Teams: the surface the team-builder and feed screens import. The store,
 * Showdown, analysis and cloud-sync modules export more (used by their own
 * tests and by each other); this barrel only re-exports what the screens
 * pull in through `@/lib/team`.
 */
export { sanitizeGameTeamId } from "@/lib/team/game-id";
export {
  defensiveWeakSpots,
  speedTiers,
  type SpeedTierMode,
} from "@/lib/team/heat-map";
export {
  abilityMatchupNotes,
  attackingTypes,
  battleTypes,
  coverageGaps,
  defensiveOverview,
  memberLabel,
  offensiveCoverage,
  teamWarnings,
  type AbilityMatchupNote,
  type TeamWarning,
} from "@/lib/team/analysis";
export { exportTeam, importTeam } from "@/lib/team/showdown";
export { DEFAULT_TEAM_NAME, sortByUpdated } from "@/lib/team/team-ops";
export { TEAMS_STORAGE_KEY } from "@/lib/team/team-store";
export { rowToTeam } from "@/lib/team/cloud-team-store";
export { useTeams } from "@/lib/team/use-teams";
