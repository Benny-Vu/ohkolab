import { SegmentedControl } from "@/components/segmented-control";
import { useT } from "@/lib/i18n/t";
import { useBattleFormat } from "@/lib/preferences";
import type { BattleFormat } from "@/types/battle";

/** Singles / doubles switch with a clear active state. */
export function FormatToggle({ className }: { className?: string }) {
  const [format, setFormat] = useBattleFormat();
  const t = useT();
  return (
    <SegmentedControl
      options={[
        { value: "singles", label: t("calc.formatSingles") },
        { value: "doubles", label: t("calc.formatDoubles") },
      ]}
      value={format}
      onValueChange={(value) => setFormat(value as BattleFormat)}
      aria-label={t("calc.battleFormat")}
      className={className}
    />
  );
}
