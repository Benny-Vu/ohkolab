/**
 * Supabase clients and paged reads for the Edge Functions (Deno).
 *
 * The functions run with the standard Edge Function env vars
 * (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); the service role bypasses
 * row-level security, which is what these functions need: the client
 * cannot update post_images, moderation_actions or notifications, and
 * only the service role may move files between the image buckets.
 */
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

/**
 * A client with the service role key. Never expose its responses to the
 * caller unfiltered: it sees every row and every column.
 */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * The user the request's Authorization header belongs to. The platform
 * verifies the JWT before the function runs; this asks the auth server to
 * confirm it again and hand us the user id, without trusting the client
 * to tell us who it is.
 */
export async function userFromRequest(
  req: Request,
): Promise<{ id: string } | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!token) return null;
  const { data, error } = await serviceClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

/**
 * Reads every row of a table, 1000 at a time (the PostgREST page size the
 * project uses), feeding each row to `visit`. The cleanup function walks
 * post_images and moderation_actions this way; the result sets are what the
 * pure selectors in _shared/moderation.ts compare storage listings against.
 */
export async function selectAll<T>(
  db: SupabaseClient,
  table: string,
  columns: string,
  visit: (row: T) => void,
): Promise<void> {
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`${table} read failed: ${error.message}`);
    for (const row of data as T[]) visit(row);
    if (data.length < pageSize) return;
  }
}
