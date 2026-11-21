import { Link, Navigate, useLocation } from "react-router";
import {
  BookOpenIcon,
  ChevronRightIcon,
  CloudSunIcon,
  LightbulbIcon,
  ShapesIcon,
  type LucideIcon,
} from "lucide-react";

import {
  LEARN_SECTIONS,
  localized,
  sectionEntryCount,
  type LearnSectionId,
} from "@/features/learn/guides";
import { Page } from "@/components/page";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";

/**
 * The /learn hub: a short intro and one equal-size card per section —
 * icon tile, title, one-line description, an entry count and a chevron —
 * one column on phones, two on desktop, so new sections slot in.
 *
 * The old calc anchors (#damage-rolls, #ohko, #2hko, #stat-points,
 * #speed-ties) forward to the guide pages that replaced them.
 */

/** Old anchor → guide page. */
const FORWARDED_HASHES: Record<string, string> = {
  "damage-rolls": "/learn/damage-rolls",
  ohko: "/learn/ohko",
  "2hko": "/learn/ohko",
  "stat-points": "/learn/stat-points",
  "speed-ties": "/learn/speed-ties",
};

const SECTION_ICONS: Record<LearnSectionId, LucideIcon> = {
  vocabulary: BookOpenIcon,
  concepts: LightbulbIcon,
  types: ShapesIcon,
  field: CloudSunIcon,
};

export function LearnHubPage() {
  const t = useT();
  const [locale] = useLocale();
  const { hash } = useLocation();

  // Links from before the hub keep working: the anchor becomes the page.
  const forwarded = FORWARDED_HASHES[hash.slice(1)];
  if (forwarded) {
    return <Navigate to={forwarded} replace />;
  }

  return (
    <Page
      title={t("learn.title")}
      description={t("learn.description")}
      width="narrow"
    >
      {/* Equal-size cards (auto-rows-fr), one row each: icon tile, then
          title, a description that wraps to two lines (never cut mid-line)
          and the count, then a chevron — the owner-approved sketch. */}
      <div className="grid auto-rows-fr gap-3 md:grid-cols-2 md:gap-4">
        {LEARN_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.id];
          const count = sectionEntryCount(section.id);
          return (
            <Link
              key={section.id}
              to={`/learn/${section.id}`}
              className="flex items-center gap-3 rounded-md border bg-card p-4 outline-none transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-sunken text-accent-brand-text">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-heading text-lg font-semibold tracking-tight">
                  {localized(section.title, locale)}
                </span>
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {localized(section.description, locale)}
                </span>
                <span className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                  {count === 1
                    ? t("learn.countOne")
                    : t("learn.countMany", { count })}
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
