import { useBattleFormat } from "@/lib/preferences";
import { formatRelativeTime } from "@/lib/relative-time";
import { useT } from "@/lib/i18n/t";
import { useMetagameSnapshot } from "@/features/metagame/use-metagame";

/**
 * The one data-freshness label: which regulation the usage numbers come
 * from and how old the snapshot is. Renders nothing until the snapshot
 * loads (never a placeholder). The regulation comes from the same
 * snapshot every screen reads, so two screens can never disagree.
 */
export function DataBadge({ className }: { className?: string }) {
  const [format] = useBattleFormat();
  const snapshot = useMetagameSnapshot(format, null);
  const t = useT();
  if (!snapshot.data) return null;
  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-1 text-xs text-muted-foreground"
      }
    >
      {t("meta.dataBadge", {
        regulation: snapshot.data.regulation,
        updated: formatRelativeTime(snapshot.data.generatedAt),
      })}
    </span>
  );
}
