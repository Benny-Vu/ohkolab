/**
 * Input rules for accounts and profiles. Pure functions: each validator
 * returns an error message to show the user, or null when the value is fine.
 * The profile limits are also enforced by check constraints in
 * `supabase/migrations/` and must stay in step with them.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const DISPLAY_NAME_MAX_LENGTH = 40;
export const BIO_MAX_LENGTH = 300;
export const AVATAR_SPECIES_MAX_LENGTH = 60;
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt, which the auth server uses, ignores everything past 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const USERNAME_RULES = `${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters: lowercase letters, digits and underscores.`;

/** Usernames are stored lowercase, which is what makes them unique regardless of case. */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

/** Checks an already normalized username. */
export function validateUsername(username: string): string | null {
  if (username.length === 0) return "Choose a username.";
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Username can only contain lowercase letters, digits and underscores.";
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
    return `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

export function validateBio(bio: string | null): string | null {
  if (bio !== null && bio.length > BIO_MAX_LENGTH) {
    return `Bio must be at most ${BIO_MAX_LENGTH} characters.`;
  }
  return null;
}

export function validateAvatarSpecies(species: string | null): string | null {
  if (species !== null && species.length > AVATAR_SPECIES_MAX_LENGTH) {
    return "That Pokémon cannot be used as an avatar.";
  }
  return null;
}

export function normalizeEmail(input: string): string {
  return input.trim();
}

export function validateEmail(email: string): string | null {
  if (email.length === 0) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  return null;
}

/** For signing in: only checks that something was typed. */
export function validateCurrentPassword(password: string): string | null {
  return password.length === 0 ? "Enter your password." : null;
}

/** For choosing a password (sign-up, reset). */
export function validateNewPassword(password: string): string | null {
  if (password.length === 0) return "Choose a password.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}
