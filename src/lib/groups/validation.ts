/**
 * Input rules for groups. Pure functions: each validator returns an error
 * message to show the user, or null when the value is fine. The limits mirror
 * the check constraints in `supabase/migrations/20261118100000_social_wave4.sql`
 * and must stay in step with them. Slug uniqueness is enforced server-side.
 */

export const GROUP_SLUG_MIN = 3;
export const GROUP_SLUG_MAX = 40;
export const GROUP_NAME_MAX = 60;
export const GROUP_DESCRIPTION_MAX = 500;

export const GROUP_VISIBILITIES = ["public", "invite_only"] as const;
export type GroupVisibility = (typeof GROUP_VISIBILITIES)[number];

export const GROUP_ROLES = ["owner", "moderator", "member"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

export const GROUP_MEMBER_STATUSES = [
  "active",
  "invited",
  "requested",
] as const;
export type GroupMemberStatus = (typeof GROUP_MEMBER_STATUSES)[number];

const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Derives a group address from a name: lowercase, whitespace to hyphens,
 * anything else invalid stripped. May be empty or too short; `validateSlug`
 * decides.
 */
export function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Group addresses are stored lowercase. */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Checks an already normalized slug. Uniqueness is checked server-side. */
export function validateSlug(slug: string): string | null {
  if (slug.length === 0) return "Choose an address for your group.";
  if (slug.length < GROUP_SLUG_MIN) {
    return `The address must be at least ${GROUP_SLUG_MIN} characters.`;
  }
  if (slug.length > GROUP_SLUG_MAX) {
    return `The address must be at most ${GROUP_SLUG_MAX} characters.`;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return "The address can only contain lowercase letters, digits and hyphens.";
  }
  return null;
}

export function normalizeGroupName(name: string): string {
  return name.trim();
}

/** Checks an already normalized name. */
export function validateGroupName(name: string): string | null {
  if (name.length === 0) return "Choose a name for your group.";
  if (name.length > GROUP_NAME_MAX) {
    return `Names are limited to ${GROUP_NAME_MAX} characters.`;
  }
  return null;
}

/** Trims optional text; an empty result becomes null (the field is cleared). */
export function normalizeGroupDescription(
  description: string | null | undefined,
): string | null {
  const trimmed = description?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/** Checks an already normalized description. */
export function validateGroupDescription(
  description: string | null,
): string | null {
  if (description !== null && description.length > GROUP_DESCRIPTION_MAX) {
    return `Descriptions are limited to ${GROUP_DESCRIPTION_MAX} characters.`;
  }
  return null;
}

/** Checks the visibility value before it is sent to the database. */
export function validateGroupVisibility(visibility: string): string | null {
  if (!GROUP_VISIBILITIES.includes(visibility as GroupVisibility)) {
    return "Choose who can join the group.";
  }
  return null;
}

/** True when the role can moderate the group (owner or moderator). */
export function canModerateGroup(role: GroupRole | null): boolean {
  return role === "owner" || role === "moderator";
}

/** Narrows a database string to a GroupVisibility, defaulting to public. */
export function asGroupVisibility(value: string): GroupVisibility {
  return value === "invite_only" ? "invite_only" : "public";
}

/** Narrows a database string to a GroupRole, defaulting to member. */
export function asGroupRole(value: string): GroupRole {
  return value === "owner" || value === "moderator" ? value : "member";
}

/** Narrows a database string to a GroupMemberStatus, defaulting to active. */
export function asGroupMemberStatus(value: string): GroupMemberStatus {
  return value === "invited" || value === "requested" ? value : "active";
}
