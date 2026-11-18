import type { Profile } from "@/lib/auth/types";

/** Usernames the auth server generates before the player chooses one. */
const GENERATED_USERNAME_PATTERN = /^trainer_[0-9a-f]{10}$/;

/**
 * True while the profile still carries the generated `trainer_…` username.
 * That pattern is the whole first-run signal: no schema change involved.
 */
export function needsOnboarding(
  profile: Profile | null,
): profile is Profile & { username: string } {
  return profile !== null && GENERATED_USERNAME_PATTERN.test(profile.username);
}
