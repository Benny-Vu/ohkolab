import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/** The Supabase client, typed with this app's schema. */
export type AppSupabaseClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  /** The anon (publishable) key. Never the service_role key. */
  anonKey: string;
}

interface SupabaseEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  MODE?: string;
}

/**
 * Reads the Supabase settings from the environment. Returns null when either
 * value is missing or the URL is not a web address, and always under the test
 * runner, so a test can never reach the real project even when a developer's
 * `.env.local` is present.
 */
function readSupabaseConfig(env: SupabaseEnv): SupabaseConfig | null {
  if (env.MODE === "test") return null;
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { url, anonKey };
}

function buildClient(config: SupabaseConfig | null): AppSupabaseClient | null {
  if (!config) return null;
  try {
    return createClient<Database>(config.url, config.anonKey, {
      auth: {
        // PKCE: OAuth and email links come back with a one-time `?code=`.
        flowType: "pkce",
        // The `/auth/callback` page finishes redirects (see `@/lib/auth`), so
        // the client must not also consume the code on its own.
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch {
    return null;
  }
}

/** The settings in use, or null when the app runs without a backend. */
export const supabaseConfig: SupabaseConfig | null = readSupabaseConfig(
  import.meta.env,
);

/**
 * The shared Supabase client, or null when `VITE_SUPABASE_URL` or
 * `VITE_SUPABASE_ANON_KEY` is missing (tests, a fresh clone). Importing this
 * module never throws: check for null and fall back to guest behaviour. For
 * anything about the signed-in user, prefer `useAuth()` from `@/lib/auth`.
 */
export const supabase: AppSupabaseClient | null = buildClient(supabaseConfig);
