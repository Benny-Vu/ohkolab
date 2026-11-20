import { useDisplayName } from "@/data";
import { useT } from "@/lib/i18n/t";

import { DamageMeter } from "@/components/damage-meter";
import { KoLabel } from "@/components/ko-label";
import { koResultOf } from "@/features/calc/ko-result";
import type { CalcResultAttachment } from "@/features/feed/attachment";

/**
 * The calc-result attachment on a post card. It lives in its own lazy
 * chunk because it is the only part of a post card that needs the
 * Pokémon data layer (species and move display names): posts without a
 * calc attachment never download the dex, which keeps the home page
 * lean for signed-out visitors.
 */
export function CalcAttachment({
  calcResult,
}: {
  calcResult: CalcResultAttachment;
}) {
  const t = useT();
  const nameOf = useDisplayName();

  return (
    <div className="mt-3 rounded-md border bg-surface-sunken p-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 truncate text-sm font-medium">
          {t("postCard.vs", {
            a: nameOf("species", calcResult.attacker),
            b: nameOf("species", calcResult.defender),
          })}
        </p>
        {(() => {
          const ko = koResultOf(calcResult.koText);
          return ko ? (
            <KoLabel className="ml-auto shrink-0" result={ko} />
          ) : (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {calcResult.koText}
            </span>
          );
        })()}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium">
          {nameOf("move", calcResult.move)}
        </span>
        <span className="font-heading text-lg font-semibold tabular-nums">
          {calcResult.minPercent === calcResult.maxPercent
            ? `${calcResult.maxPercent}%`
            : `${calcResult.minPercent} - ${calcResult.maxPercent}%`}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {t("postCard.damageRange", {
            min: calcResult.min,
            max: calcResult.max,
          })}
        </span>
      </div>
      <DamageMeter
        className="mt-2"
        minPercent={calcResult.minPercent}
        maxPercent={calcResult.maxPercent}
        hpPercent={100}
        size="sm"
      />
    </div>
  );
}
