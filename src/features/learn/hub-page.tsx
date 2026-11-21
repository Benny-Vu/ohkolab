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
      <div className="grid gap-4 md:grid-cols-2">
        {LEARN_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.id];
          const count = sectionEntryCount(section.id);
          return (
            <Link
              key={section.id}
              to={`/learn/${section.id}`}
              className="flex min-h-32 flex-col rounded-md border bg-card p-4 outline-none transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-surface-sunken focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="grid size-10 place-items-center rounded-md bg-surface-sunken text-foreground">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="mt-3 font-heading text-base font-semibold tracking-tight">
                {localized(section.title, locale)}
              </span>
              <span className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {localized(section.description, locale)}
              </span>
              <span className="mt-auto flex items-center justify-between pt-3">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {count === 1
                    ? t("learn.countOne")
                    : t("learn.countMany", { count })}
                </span>
                <ChevronRightIcon
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
