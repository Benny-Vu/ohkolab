import type { AppSupabaseClient } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { getCloudTeamStore } from "@/lib/team/cloud-team-store";
import { localTeamStore, type TeamStore } from "@/lib/team/team-store";

/** What `useAuth` tells the store switcher. Structural on purpose. */
interface ActiveStoreAuth {
  isConfigured: boolean;
  user: { id: string } | null;
}

// The client the cloud team store talks to. Tests swap it because the real
// client is always null under the test runner.
let syncClient: AppSupabaseClient | null = supabase;

/** Test seam: the Supabase client behind the cloud team store. */
export function setTeamsSyncClient(client: AppSupabaseClient | null): void {
  syncClient = client;
}

/**
 * The store the app should use right now: the local one for guests and
 * unconfigured builds, the cloud one for signed-in users.
 */
export function resolveActiveTeamStore(auth: ActiveStoreAuth): TeamStore {
  if (!auth.isConfigured || !auth.user || !syncClient) return localTeamStore;
  return getCloudTeamStore(syncClient, auth.user.id);
}
