import { EmptyState } from "@/components/empty-state";
import { useT } from "@/lib/i18n/t";

/**
 * PLACEHOLDER — the top-teams-ui stream replaces this file. It owns
 * `src/features/metagame/top-teams/**`: the team cards (TeamPreview,
 * event, placing, date, record), the regulation filter, the team detail
 * with its actions (Showdown paste, battle mode, save, source link) and
 * the attribution line.
 */
export function TopTeamsView() {
  const t = useT();
  return <EmptyState title={t("meta.topTeamsEmpty")} />;
}
