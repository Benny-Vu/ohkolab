/** Teams: storage, Showdown text and analysis. */
export {
  defensiveWeakSpots,
  speedTiers,
  type SpeedTier,
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
  type CoverageEntry,
  type CoverageGap,
  type DefensiveEntry,
  type TeamWarning,
} from "@/lib/team/analysis";
export {
  exportSet,
  exportTeam,
  importSet,
  importTeam,
  toStatPoints,
  type ImportedSet,
  type ImportedTeam,
} from "@/lib/team/showdown";
export {
  addMember,
  createTeam,
  DEFAULT_TEAM_NAME,
  duplicateTeam,
  moveMember,
  removeMember,
  renameTeam,
  setMembers,
  setTeamFormat,
  sortByUpdated,
  updateMember,
  type NewTeamInit,
} from "@/lib/team/team-ops";
export {
  createLocalTeamStore,
  localTeamStore,
  parseStoredTeams,
  sanitizeSet,
  sanitizeTeam,
  serializeTeams,
  TEAMS_BACKUP_KEY,
  TEAMS_STORAGE_KEY,
  TEAMS_STORAGE_VERSION,
  type ParsedTeams,
  type TeamStore,
} from "@/lib/team/team-store";
export {
  createCloudTeamStore,
  getCloudTeamStore,
  isCloudTeamStore,
  rowToTeam,
  teamToUpsert,
  type CloudSyncState,
  type CloudSyncStatus,
  type CloudTeamStore,
  type CloudTeamStoreOptions,
} from "@/lib/team/cloud-team-store";
export {
  copyLocalTeamsToAccount,
  copiedTeamsFlagKey,
} from "@/lib/team/copy-local-teams";
export {
  resolveActiveTeamStore,
  setTeamsSyncClient,
} from "@/lib/team/active-store";
export {
  createTeamActions,
  useTeams,
  type TeamActions,
  type TeamSync,
  type UseTeams,
} from "@/lib/team/use-teams";
