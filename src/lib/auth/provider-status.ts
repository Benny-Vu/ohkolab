import type { OAuthProvider } from "@/lib/auth/types";
import type { SupabaseConfig } from "@/lib/supabase";

type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/**
 * Builds a check for "is this OAuth provider switched on?" from the Supabase
 * project's public auth settings (`GET /auth/v1/settings`, readable with the
 * anon key). The answer is true or false, or null when it cannot be known
 * (guest mode, offline, an unexpected response); callers treat null as "try
 * anyway". The settings are fetched once and reused; a failed fetch is retried
 * on the next call.
 */
export function createProviderCheck(
  config: SupabaseConfig | null,
  fetchSettings: FetchLike = (input, init) => fetch(input, init),
): (provider: OAuthProvider) => Promise<boolean | null> {
  let settings: Promise<unknown> | undefined;

  return async (provider) => {
    if (!config) return null;
    settings ??= fetchSettings(
      `${config.url.replace(/\/$/, "")}/auth/v1/settings`,
      { headers: { apikey: config.anonKey } },
    )
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);

    const body = await settings;
    if (body === null) settings = undefined;

    const external =
      typeof body === "object" && body !== null
        ? (body as { external?: unknown }).external
        : undefined;
    const enabled =
      typeof external === "object" && external !== null
        ? (external as Record<string, unknown>)[provider]
        : undefined;
    return typeof enabled === "boolean" ? enabled : null;
  };
}
