import type { PokemonUsage } from "@/lib/metagame/types";
import { useT } from "@/lib/i18n/t";
import { topTeamMemberToSet, type TopTeamSet } from "@/lib/top-teams/sets";
import type { TopTeam } from "@/lib/top-teams/types";

/**
 * The bridge between the committed top-teams snapshot and the app's set
 * shape: a usage index over the doubles snapshot, the team-to-sets
 * builder that borrows each species' most common SP spread, and the
 * localized meta lines the card and the detail dialog share.
 */

/** The published record: "6W 0L", or "5W 1L 1T" when the sheet has ties. */
export function recordText(t: ReturnType<typeof useT>, team: TopTeam): string {
  return team.record.ties > 0
    ? t("meta.recordWithTies", {
        wins: team.record.wins,
        losses: team.record.losses,
        ties: team.record.ties,
      })
    : t("meta.record", {
        wins: team.record.wins,
        losses: team.record.losses,
      });
}

/** The event's player count as one localized phrase. */
export function playersText(t: ReturnType<typeof useT>, team: TopTeam): string {
  return team.players === 1
    ? t("meta.eventPlayersOne")
    : t("meta.eventPlayersMany", { count: team.players });
}

/** The doubles snapshot's usage rows by species. */
export function buildUsageIndex(
  pokemon: readonly PokemonUsage[] | undefined,
): Map<string, PokemonUsage> {
  const index = new Map<string, PokemonUsage>();
  for (const entry of pokemon ?? []) {
    index.set(entry.species, entry);
  }
  return index;
}

/**
 * A published team as the app's set shape, in team order. Members whose
 * species does not resolve are left out; the ingest already validated
 * against `@/data`, so that only guards a hand-edited file.
 *
 * The usage lookup tries the member's own species first (how the usage
 * data names it) and then the team-legal species the set builder resolves
 * a battle-only forme to, so a Mega's SP spread comes from its base
 * species' row.
 */
export function buildTopTeamSets(
  team: TopTeam,
  usageBySpecies: ReadonlyMap<string, PokemonUsage>,
): TopTeamSet[] {
  const built: TopTeamSet[] = [];
  for (const member of team.members) {
    const direct = topTeamMemberToSet(
      member,
      usageBySpecies.get(member.species) ?? null,
    );
    if (!direct) continue;
    const usage =
      usageBySpecies.get(member.species) ??
      usageBySpecies.get(direct.set.species) ??
      null;
    built.push(usage ? (topTeamMemberToSet(member, usage) ?? direct) : direct);
  }
  return built;
}
