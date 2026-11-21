import { Link } from "react-router";

import { useDisplayName } from "@/data/display-names";
import { findLearnSection, localized } from "@/features/learn/guides";
import { LearnFrame } from "@/features/learn/learn-frame";
import { TypeCard } from "@/features/learn/types/type-card";
import { typeAnchor } from "@/features/learn/types/type-ids";
import { TypeChartGrid } from "@/features/learn/types/type-chart-grid";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { TYPE_NAMES } from "@/types/pokemon";

/**
 * The Types section page: one card per type — attacking, defending and
 * the type's verified traits — with the type chart at the bottom. The
 * sidebar is the page's own: the 18 types plus the chart, both deep
 * links into the page. On phones the types are toggle rows that open
 * into the card.
 */

/** The sidebar: the 18 types and the chart, linking to their anchors. */
function TypesSidebar() {
  const t = useT();
  const displayName = useDisplayName();
  const linkClass =
    "block rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:bg-surface-sunken hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";
  return (
    <nav aria-label={t("learn.inThisSection")}>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("learn.inThisSection")}
      </p>
      <ul className="grid gap-1.5">
        {TYPE_NAMES.map((type) => (
          <li key={type}>
            <Link to={`/learn/types#${typeAnchor(type)}`} className={linkClass}>
              {displayName("type", type)}
            </Link>
          </li>
        ))}
        <li>
          <Link to="/learn/types#type-chart" className={linkClass}>
            {t("learn.typeChart")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function TypesPage() {
  const [locale] = useLocale();
  const info = findLearnSection("types");
  return (
    <LearnFrame section="types" sidebar={<TypesSidebar />}>
      <article className="grid gap-3">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {info ? localized(info.title, locale) : "Types"}
        </h1>
        {TYPE_NAMES.map((type) => (
          <TypeCard key={type} type={type} />
        ))}
        <TypeChartGrid />
      </article>
    </LearnFrame>
  );
}
