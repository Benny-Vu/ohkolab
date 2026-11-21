import { CardTitle } from "@/components/card-title";
import { DamageMeter } from "@/components/damage-meter";
import { useDisplayName } from "@/data";
import { useT } from "@/lib/i18n/t";
import {
  DAMAGE_ROLL_EXAMPLE,
  damageRollExample,
} from "@/features/learn/damage-roll-example";

/** The live example blocks a registry entry can ask for. */
export type LearnExampleKind = "damage-rolls";

/**
 * The live sample calculation under the damage-rolls guide: a real
 * Champions number from the calc's own maths.
 */
export function DamageRollExampleBlock() {
  const t = useT();
  const nameOf = useDisplayName();
  const result = damageRollExample();

  return (
    <div className="mt-2 grid gap-2 rounded-md border bg-surface-sunken p-3">
      <CardTitle>{t("learn.exampleTitle")}</CardTitle>
      <p className="text-sm leading-relaxed">
        {t("learn.exampleLine", {
          move: nameOf("move", DAMAGE_ROLL_EXAMPLE.move),
          attacker: nameOf("species", DAMAGE_ROLL_EXAMPLE.attacker),
          defender: nameOf("species", DAMAGE_ROLL_EXAMPLE.defender),
          min: result.min,
          max: result.max,
          minPercent: result.minPercent,
          maxPercent: result.maxPercent,
        })}
      </p>
      <DamageMeter
        minPercent={result.minPercent}
        maxPercent={result.maxPercent}
        hpPercent={100}
      />
      <p className="text-xs text-muted-foreground">{t("learn.exampleNote")}</p>
    </div>
  );
}

/** Renders the example block an entry asks for, if any. */
export function LearnExample({ kind }: { kind: LearnExampleKind }) {
  switch (kind) {
    case "damage-rolls":
      return <DamageRollExampleBlock />;
  }
}
