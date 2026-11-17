import type { TeamInsert } from "@/lib/database.types";
import type { AppSupabaseClient } from "@/lib/supabase";
import { localTeamStore } from "@/lib/team/team-store";
import type { Team } from "@/types/team";

/** Set once the local teams have been copied into an account. */
export function copiedTeamsFlagKey(userId: string): string {
  return `ohkolab:teams:copied:${userId}`;
}

function hasCopiedFlag(userId: string): boolean {
  try {
    return globalThis.localStorage.getItem(copiedTeamsFlagKey(userId)) !== null;
  } catch {
    return false;
  }
}

function setCopiedFlag(userId: string): void {
  try {
    globalThis.localStorage.setItem(copiedTeamsFlagKey(userId), "1");
  } catch {
    // Without the flag the copy runs again, but existing ids are skipped.
  }
}

/**
 * Copies the local teams into the account once: same ids, skipping ids the
 * server already has. The local teams stay where they are, as the guest
 * fallback and the backup. Returns the teams that were copied.
 */
export async function copyLocalTeamsToAccount(
  client: AppSupabaseClient,
  userId: string,
  serverTeamIds: ReadonlySet<string>,
): Promise<Team[]> {
  if (hasCopiedFlag(userId)) return [];
  const missing = localTeamStore
    .list()
    .filter((team) => !serverTeamIds.has(team.id));
  if (missing.length === 0) {
    setCopiedFlag(userId);
    return [];
  }
  const payloads: TeamInsert[] = missing.map((team) => ({
    id: team.id,
    user_id: userId,
    name: team.name,
    data: team.members,
    format: team.format,
    is_public: false,
    created_at: team.createdAt,
    updated_at: team.updatedAt,
  }));
  const { error } = await client.from("teams").insert(payloads);
  if (error) return [];
  setCopiedFlag(userId);
  return missing.map((team) => ({ ...team, isPublic: false }));
}
