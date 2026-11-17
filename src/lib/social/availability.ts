import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import {
  describeSocialError,
  isMissingRelationError,
  socialFailure,
  type SocialFailure,
} from "@/lib/social/errors";

/**
 * Whether the social feature can be used at all:
 * - "ready": the Supabase client exists and the tables are expected to exist
 * - "not-configured": there is no Supabase client (missing env values)
 * - "not-installed": the migration has not been applied (cached after the
 *   first missing-relation error so later hooks fail soft without a toast)
 */
export type SocialAvailability = "ready" | "not-configured" | "not-installed";

let socialNotInstalled = false;

export function markSocialNotInstalled(): void {
  socialNotInstalled = true;
}

export function isSocialNotInstalled(): boolean {
  return socialNotInstalled;
}

/** Test-only: forget the cached "not installed" answer. */
export function resetSocialInstallState(): void {
  socialNotInstalled = false;
}

export function socialAvailability(
  client: AppSupabaseClient | null = supabase,
): SocialAvailability {
  if (socialNotInstalled) {
    return "not-installed";
  }
  if (!client) {
    return "not-configured";
  }
  return "ready";
}

/**
 * Turns a read error into the empty result when the tables are missing
 * (fail soft, no toast); rethrows anything else as a mapped SocialFailure.
 */
export function softReadError<T>(error: unknown, empty: T): T {
  if (isMissingRelationError(error)) {
    markSocialNotInstalled();
    return empty;
  }
  throw describeSocialError(error);
}

/**
 * Maps a write error to a SocialFailure, remembering the missing-tables case
 * so every later hook fails soft.
 */
export function describeWriteError(error: unknown): SocialFailure {
  if (isMissingRelationError(error)) {
    markSocialNotInstalled();
    return socialFailure("not_installed");
  }
  return describeSocialError(error);
}
