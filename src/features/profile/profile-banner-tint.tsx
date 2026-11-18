import { getSpecies } from "@/data";
import { TYPE_COLORS } from "@/lib/type-colors";

/**
 * A subtle band behind the profile header, tinted with the avatar species'
 * first type colour. Pure decoration: aria-hidden, no pointer events.
 */
export function ProfileBannerTint({
  avatarSpecies,
}: {
  avatarSpecies: string | null;
}) {
  if (!avatarSpecies) return null;

  const species = getSpecies(avatarSpecies);
  const type = species?.types[0];
  if (!type) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="profile-banner-tint"
      className="pointer-events-none absolute inset-x-0 top-0 h-16"
      style={{ backgroundColor: `${TYPE_COLORS[type]}1f` }}
    />
  );
}
