import { typeEffectiveness } from "@/data/type-chart";
import { typeHeaderCode } from "@/features/learn/types/type-ids";
import { useT } from "@/lib/i18n/t";
import { TYPE_COLORS } from "@/lib/type-colors";
import { cn } from "@/lib/utils";
import { TYPE_NAMES, type TypeName } from "@/types/pokemon";

/**
 * The 18×18 type chart at the bottom of the Types page: rows attack,
 * columns defend. Cell tints come from the existing tokens — success for
 * ×2, destructive for ×½, border on background for ×0 — never from the
 * saturated wiki colours. The whole grid scrolls sideways inside its
 * card, with the attacker column sticky at the left edge.
 */

/** How one multiplier renders in a cell: its text and its classes. */
const CELL: Record<number, { text: string; className: string }> = {
  2: { text: "2", className: "bg-success/15 font-semibold text-success" },
  0.5: {
    text: "½",
    className: "bg-destructive/15 font-semibold text-destructive",
  },
  0: {
    text: "0",
    className: "border border-border bg-background text-muted-foreground",
  },
};

/** The compact coloured pill the chart's headers use. */
function HeaderBadge({ type }: { type: TypeName }) {
  return (
    <span
      className="inline-flex h-5 w-7 items-center justify-center rounded-md text-2xs font-semibold tracking-wide text-white uppercase"
      style={{ backgroundColor: TYPE_COLORS[type] }}
    >
      {typeHeaderCode(type)}
    </span>
  );
}

/** One chart cell: the multiplier's text in its tint, or blank for ×1. */
function ChartCell({ multiplier }: { multiplier: number }) {
  const cell = multiplier === 1 ? undefined : CELL[multiplier];
  return (
    <span
      className={cn(
        "flex h-6 w-7 items-center justify-center rounded-md text-2xs",
        cell?.className,
      )}
    >
      {cell?.text}
    </span>
  );
}

/** One legend entry: a sample cell and its meaning. */
function LegendItem({
  multiplier,
  label,
}: {
  multiplier: number;
  label: string;
}) {
  return (
    <li className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <ChartCell multiplier={multiplier} />
      {label}
    </li>
  );
}

/** The full type chart with its legend, inside one card. */
export function TypeChartGrid() {
  const t = useT();
  return (
    <section
      id="type-chart"
      aria-labelledby="type-chart-heading"
      className="grid scroll-mt-24 gap-3 rounded-md border bg-card p-4"
    >
      <h2
        id="type-chart-heading"
        className="font-heading text-lg font-semibold tracking-tight"
      >
        {t("learn.typeChart")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t("learn.types.chartGuide")}
      </p>
      <div className="relative">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0 tabular-nums">
            <thead>
              <tr>
                <th aria-hidden className="sticky left-0 z-10 bg-card p-0.5" />
                {TYPE_NAMES.map((defending) => (
                  <th key={defending} scope="col" className="bg-card p-0.5">
                    <HeaderBadge type={defending} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TYPE_NAMES.map((attacking) => (
                <tr key={attacking}>
                  <th scope="row" className="sticky left-0 z-10 bg-card p-0.5">
                    <HeaderBadge type={attacking} />
                  </th>
                  {TYPE_NAMES.map((defending) => (
                    <td key={defending} className="p-0.5">
                      <ChartCell
                        multiplier={typeEffectiveness(attacking, [defending])}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* The right-edge fade: the grid scrolls sideways up to lg. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-card lg:hidden"
        />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        <LegendItem multiplier={2} label={t("learn.types.legendSuper")} />
        <LegendItem multiplier={0.5} label={t("learn.types.legendResist")} />
        <LegendItem multiplier={0} label={t("learn.types.legendNoEffect")} />
      </ul>
    </section>
  );
}
