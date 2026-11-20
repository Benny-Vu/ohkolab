import { useEffect, useState } from "react";

import { TYPE_COLORS } from "@/lib/type-colors";

/**
 * A subtle band behind the profile header, tinted with the avatar species'
 * first type colour. Pure decoration: aria-hidden, no pointer events.
 *
 * The species lookup pulls the Pokémon data layer, which this decoration
 * is not worth on the critical path: the dex imports lazily, so a bare
 * profile never downloads it and a tinted one paints its content first.
 * Resolved tints are cached per species, so the import happens once.
 */
export function ProfileBannerTint({
  avatarSpecies,
}: {
  avatarSpecies: string | null;
}) {
  const [tints, setTints] = useState<Record<string, string>>({});
  const tint = avatarSpecies ? tints[avatarSpecies] : undefined;

  useEffect(() => {
    if (!avatarSpecies || tints[avatarSpecies]) return;
    let alive = true;
    void import("@/data").then(({ getSpecies }) => {
      const type = getSpecies(avatarSpecies)?.types[0];
      if (type && alive) {
        const color = `${TYPE_COLORS[type]!}1f`;
        setTints((previous) => ({ ...previous, [avatarSpecies]: color }));
      }
    });
    return () => {
      alive = false;
    };
  }, [avatarSpecies, tints]);

  if (!tint) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="profile-banner-tint"
      className="pointer-events-none absolute inset-x-0 top-0 h-16"
      style={{ backgroundColor: tint }}
    />
  );
}
