import type { Translate } from "@/components/stat-labels";
import type { SetOrigin } from "@/lib/calc/state";
import { formatShare } from "@/lib/metagame/format";

/**
 * One side's set source in words: "Common set · 35.6% usage" for a set the
 * usage data filled, "Custom" for a hand-edited or handed-over set, and
 * "Assumed SP" for the blank default a fresh species pick starts from.
 */
export function setSourceText(origin: SetOrigin, t: Translate): string {
  switch (origin.kind) {
    case "common": {
      const usage = formatShare(origin.speciesUsage);
      return origin.index === 1
        ? t("calc.setSourceCommon", { usage })
        : t("calc.setSourceCommonN", { usage, index: origin.index });
    }
    case "custom":
      return t("calc.setSourceCustom");
    case "assumed":
      return t("calc.setSourceAssumed");
  }
}
