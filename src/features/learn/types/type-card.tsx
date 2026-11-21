import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { useDisplayName } from "@/data/display-names";
import { TypeBadge } from "@/components/type-badge";
import { localized, type LocalizedText } from "@/features/learn/guides";
import { matchupsFor } from "@/features/learn/types/matchups";
import { typeAnchor } from "@/features/learn/types/type-ids";
import { TYPE_TRAITS } from "@/features/learn/types/type-traits";
import { useMediaQuery } from "@/lib/use-media-query";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";
import type { TypeName } from "@/types/pokemon";

/**
 * One type's card: attacking and defending rows of TypeBadges, plus the
 * type's verified traits. Desktop shows full cards; on phones each type is
 * a toggle row that opens into the card.
 */

/** One labeled row of TypeBadges; a row with no types is left out. */
function BadgeRow({
  label,
  types,
}: {
  label: string;
  types: readonly TypeName[];
}) {
  if (types.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {types.map((type) => (
          <li key={type}>
            <TypeBadge type={type} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A traits list, only when the type has verified traits. */
function TraitsList({ traits }: { traits: readonly LocalizedText[] }) {
  const [locale] = useLocale();
  const t = useT();
  return (
    <div className="grid gap-1.5">
      <h3 className="font-heading text-sm font-semibold">
        {t("learn.types.traits")}
      </h3>
      <ul className="grid gap-1.5">
        {traits.map((trait, index) => (
          <li key={index} className="text-sm leading-relaxed">
            {localized(trait, locale)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The card body shared by both layouts: attacking and defending blocks. */
function CardBody({
  type,
  traits,
}: {
  type: TypeName;
  traits: readonly LocalizedText[] | undefined;
}) {
  const t = useT();
  const matchups = matchupsFor(type);
  return (
    <div className="grid gap-3">
      <div className="grid items-start gap-3 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <h3 className="font-heading text-sm font-semibold">
            {t("learn.types.attacking")}
          </h3>
          <div className="grid gap-2">
            <BadgeRow
              label={t("learn.types.superEffective")}
              types={matchups.superEffective}
            />
            <BadgeRow
              label={t("learn.types.notVeryEffective")}
              types={matchups.notVeryEffective}
            />
            <BadgeRow
              label={t("learn.types.noEffect")}
              types={matchups.noEffect}
            />
          </div>
        </div>
        <div className="grid content-start gap-2">
          <h3 className="font-heading text-sm font-semibold">
            {t("learn.types.defending")}
          </h3>
          <div className="grid gap-2">
            <BadgeRow label={t("learn.types.weakTo")} types={matchups.weakTo} />
            <BadgeRow
              label={t("learn.types.resists")}
              types={matchups.resists}
            />
            <BadgeRow
              label={t("learn.types.immuneTo")}
              types={matchups.immuneTo}
            />
          </div>
        </div>
      </div>
      {traits && traits.length > 0 ? <TraitsList traits={traits} /> : null}
    </div>
  );
}

/**
 * One type on the page: a full card on desktop, a toggle row that opens
 * into the card on phones.
 */
export function TypeCard({ type }: { type: TypeName }) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const displayName = useDisplayName();
  const name = displayName("type", type);
  const traits = TYPE_TRAITS[type];
  const id = typeAnchor(type);

  if (isDesktop) {
    return (
      <section
        id={id}
        className="grid scroll-mt-24 gap-3 rounded-md border bg-card p-4"
      >
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          <TypeBadge type={type} />
          {name}
        </h2>
        <CardBody type={type} traits={traits} />
      </section>
    );
  }

  return (
    <div id={id} className="scroll-mt-24 rounded-md border bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-label={name}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-md p-4 text-left outline-none transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex min-w-0 items-center gap-3">
          <TypeBadge type={type} />
          <span className="font-heading text-sm font-semibold">{name}</span>
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-base) ease-(--motion-ease-out)",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="grid gap-3 p-4 pt-0">
          <CardBody type={type} traits={traits} />
        </div>
      ) : null}
    </div>
  );
}
