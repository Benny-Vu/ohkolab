/**
 * Input rules for accounts and profiles. Pure functions: each validator
 * returns an error message to show the user, or null when the value is fine.
 * The profile limits are also enforced by check constraints in
 * `supabase/migrations/` and must stay in step with them.
 *
 * The messages render through the i18n dictionaries, so the English strings
 * come from `@/lib/i18n` — the English values must match what the lib tests
 * assert.
 */
import { t } from "@/lib/i18n/t";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const DISPLAY_NAME_MAX_LENGTH = 40;
export const BIO_MAX_LENGTH = 300;
export const AVATAR_SPECIES_MAX_LENGTH = 60;
export const LOOKING_FOR_MAX_LENGTH = 100;
const SHOWDOWN_NAME_MAX_LENGTH = 64;
const PROFILE_URL_MAX_LENGTH = 200;
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt, which the auth server uses, ignores everything past 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The username rules, localized, for the hints under the fields. */
export function usernameRules(): string {
  return t("auth.usernameRules");
}

/** Usernames are stored lowercase, which is what makes them unique regardless of case. */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

/** Checks an already normalized username. */
export function validateUsername(username: string): string | null {
  if (username.length === 0) return t("auth.errUsernameChoose");
  if (username.length < USERNAME_MIN_LENGTH) {
    return t("auth.errUsernameMin", { min: USERNAME_MIN_LENGTH });
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return t("auth.errUsernameMax", { max: USERNAME_MAX_LENGTH });
  }
  if (!USERNAME_PATTERN.test(username)) {
    return t("auth.errUsernamePattern");
  }
  return null;
}

/** Trims optional text; an empty result becomes null (the field is cleared). */
export function normalizeOptionalText(
  input: string | null | undefined,
): string | null {
  const trimmed = input?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function validateDisplayName(displayName: string | null): string | null {
  if (displayName !== null && displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return t("auth.errDisplayNameMax", { max: DISPLAY_NAME_MAX_LENGTH });
  }
  return null;
}

export function validateBio(bio: string | null): string | null {
  if (bio !== null && bio.length > BIO_MAX_LENGTH) {
    return t("auth.errBioMax", { max: BIO_MAX_LENGTH });
  }
  return null;
}

export function validateAvatarSpecies(species: string | null): string | null {
  if (species !== null && species.length > AVATAR_SPECIES_MAX_LENGTH) {
    return t("auth.errAvatarSpecies");
  }
  return null;
}

/** The favourite Pokémon uses the same shape as the avatar species. */
export function validateFavouriteSpecies(
  species: string | null,
): string | null {
  if (species !== null && species.length > AVATAR_SPECIES_MAX_LENGTH) {
    return t("auth.errAvatarSpecies");
  }
  return null;
}

/** The "looking for" line: free text, at most 100 characters. */
export function validateLookingFor(value: string | null): string | null {
  if (value !== null && value.length > LOOKING_FOR_MAX_LENGTH) {
    return t("auth.errLookingForMax", { max: LOOKING_FOR_MAX_LENGTH });
  }
  return null;
}

/** A Showdown name: free text, at most 64 characters. */
export function validateShowdownName(value: string | null): string | null {
  if (value !== null && value.length > SHOWDOWN_NAME_MAX_LENGTH) {
    return t("auth.errShowdownMax", { max: SHOWDOWN_NAME_MAX_LENGTH });
  }
  return null;
}

/** Profile links: https only, at most 200 characters. */
export function validateProfileUrl(value: string | null): string | null {
  if (value === null) return null;
  if (!/^https:\/\//.test(value) || value.length > PROFILE_URL_MAX_LENGTH) {
    return t("auth.errProfileUrl");
  }
  return null;
}

export function normalizeEmail(input: string): string {
  return input.trim();
}

export function validateEmail(email: string): string | null {
  if (email.length === 0) return t("auth.errEmailEmpty");
  if (!EMAIL_PATTERN.test(email)) return t("auth.errEmailInvalid");
  return null;
}

/** For signing in: only checks that something was typed. */
export function validateCurrentPassword(password: string): string | null {
  return password.length === 0 ? t("auth.errPasswordEmpty") : null;
}

/** For choosing a password (sign-up, reset). */
export function validateNewPassword(password: string): string | null {
  if (password.length === 0) return t("auth.errPasswordChoose");
  if (password.length < PASSWORD_MIN_LENGTH) {
    return t("auth.errPasswordMin", { min: PASSWORD_MIN_LENGTH });
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return t("auth.errPasswordMax", { max: PASSWORD_MAX_LENGTH });
  }
  return null;
}
