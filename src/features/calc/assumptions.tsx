import { assumptionParts } from "@/features/calc/assumption-parts";
import type { CalcState, SetOrigin } from "@/lib/calc/state";
import { useDisplayName } from "@/data";
import { useT } from "@/lib/i18n/t";

/**
 * The "Assumptions" line under one damage result: what the numbers assumed
 * about the defender's set and the field. Never hidden.
 */
export function AssumptionsLine({
  state,
  origin,
}: {
  state: CalcState;
  /** The set source of the defender this result hit. */
  origin: SetOrigin;
}) {
  const t = useT();
  const displayName = useDisplayName();
  const parts = assumptionParts(state, origin, t, displayName);
  return (
    <p className="text-xs text-muted-foreground">
      {t("calc.assumptionsLabel")}: {parts.join(" · ")}
    </p>
  );
}
