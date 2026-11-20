import { Page } from "@/components/page";
import { useT } from "@/lib/i18n/t";
import { getLocale, useLocale } from "@/lib/i18n/locale";
import { changelogEntries } from "@/features/changelog/entries";
import { useMarkChangelogSeenOnMount } from "@/features/changelog/use-new-entries";

/** "Nov 20, 2026" / "2026/11/20" — a plain date, no domain keys needed. */
function dateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(
    date,
  );
}

/**
 * The public "What's new" page: one line per release, newest first.
 * Visiting it counts as having seen everything, which clears the "New"
 * dot in the account menu.
 */
export function ChangelogPage() {
  const t = useT();
  const [locale] = useLocale();
  useMarkChangelogSeenOnMount();

  return (
    <Page title={t("footer.whatsNew")} width="narrow">
      <ul className="grid gap-4">
        {changelogEntries.map((entry, index) => (
          <li
            key={`${entry.date}-${index}`}
            className="grid gap-1 border-b pb-4 last:border-b-0 last:pb-0"
          >
            <p className="text-xs text-muted-foreground">
              {dateLabel(entry.date)}
            </p>
            <p className="text-sm">{locale === "ja" ? entry.ja : entry.en}</p>
          </li>
        ))}
      </ul>
    </Page>
  );
}
