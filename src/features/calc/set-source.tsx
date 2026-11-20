import { useEffect, useMemo, type Dispatch } from "react";

import { Picker, type PickerOption } from "@/components/picker";
import { useCommonSets } from "@/features/metagame/use-common-sets";
import { setSourceText } from "@/features/calc/set-source-text";
import { commonSetToPokemonSet } from "@/lib/calc/common-set";
import {
  MAX_COMMON_SETS,
  type CalcAction,
  type SetOrigin,
  type SideId,
} from "@/lib/calc/state";
import { formatShare } from "@/lib/metagame/format";
import { useBattleFormat } from "@/lib/preferences";
import { useT } from "@/lib/i18n/t";

interface SetSourceRowProps {
  side: SideId;
  /** The side's localized label, for the picker's aria-label. */
  sideLabel: string;
  /** The species currently in the set. */
  species: string;
  origin: SetOrigin;
  dispatch: Dispatch<CalcAction>;
}

/**
 * The set source of one side: a small label next to the species picker plus
 * a chooser between the species' most common sets and "Custom". A freshly
 * picked species with usage data is filled with its most common set
 * automatically; the moment any field is edited the source flips to Custom
 * and nothing is refilled until a new species is picked or a numbered set is
 * chosen again. Species without usage data get no label, as before.
 */
export function SetSourceRow({
  side,
  sideLabel,
  species,
  origin,
  dispatch,
}: SetSourceRowProps) {
  const t = useT();
  const [format] = useBattleFormat();
  const { sets, isPending } = useCommonSets(species, format, MAX_COMMON_SETS);
  const fillable = useMemo(() => sets.filter((set) => !set.assumed), [sets]);

  // The smart fill: a species just picked (origin "assumed") gets its most
  // common set once the usage snapshot arrives. Editing afterwards flips
  // the origin to "custom", so this never overwrites the user's own set.
  useEffect(() => {
    if (origin.kind !== "assumed" || isPending || fillable.length === 0) {
      return;
    }
    const first = fillable[0];
    if (!first) return;
    const set = commonSetToPokemonSet(species, first);
    if (!set) return;
    dispatch({
      type: "setSet",
      side,
      set,
      origin: {
        kind: "common",
        index: first.index,
        speciesUsage: first.speciesUsage,
      },
    });
  }, [origin.kind, isPending, fillable, species, side, dispatch]);

  // No usage data for this species: no label, no chooser, no refill.
  if (origin.kind === "assumed" || fillable.length === 0) {
    return null;
  }

  const options: PickerOption[] = fillable.map((set) => ({
    value: String(set.index),
    label:
      set.index === 1
        ? t("calc.setSourceCommon", { usage: formatShare(set.speciesUsage) })
        : t("calc.setOptionN", { index: set.index }),
  }));
  options.push({ value: "custom", label: t("calc.setSourceCustom") });

  const value = origin.kind === "common" ? String(origin.index) : "custom";

  const handleChange = (next: string) => {
    if (next === "custom") {
      // Custom keeps the set exactly as it is; only the label moves.
      dispatch({ type: "setOrigin", side, origin: { kind: "custom" } });
      return;
    }
    const common = fillable.find((set) => String(set.index) === next);
    if (!common) return;
    const set = commonSetToPokemonSet(species, common);
    if (!set) return;
    dispatch({
      type: "setSet",
      side,
      set,
      origin: {
        kind: "common",
        index: common.index,
        speciesUsage: common.speciesUsage,
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">
        {setSourceText(origin, t)}
      </span>
      <Picker
        aria-label={t("calc.setSourceAria", { side: sideLabel })}
        className="w-40"
        options={options}
        value={value}
        onValueChange={handleChange}
      />
    </div>
  );
}
