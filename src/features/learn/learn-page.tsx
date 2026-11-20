import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router";

import { CardTitle } from "@/components/card-title";
import { DamageMeter } from "@/components/damage-meter";
import { Page } from "@/components/page";
import { useDisplayName } from "@/data";
import { useT } from "@/lib/i18n/t";
import {
  DAMAGE_ROLL_EXAMPLE,
  damageRollExample,
} from "@/features/learn/damage-roll-example";

/**
 * /learn: four short explainers — damage rolls, OHKO and 2HKO, Stat Points
 * and speed ties — for players who are new to the numbers side of Pokémon
 * Champions. The damage-rolls example is a live calculation, so the range
 * on screen is a real Champions number. The anchor ids are part of the
 * app's link surface (the calc links to them), so they must not be renamed.
 */

/**
 * Scrolls to the URL hash once the page is in the DOM. A lazy route mounts
 * after the navigation, so the browser's own anchor jump fires too early;
 * this closes the gap for both fresh loads and in-app links. Effects run
 * after the DOM is committed, so the section is already there.
 */
function useHashScroll(): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "") return;
    const id = decodeURIComponent(hash.slice(1));
    document.getElementById(id)?.scrollIntoView();
  }, [hash]);
}

export function LearnPage() {
  const t = useT();
  useHashScroll();

  return (
    <Page
      title={t("learn.title")}
      description={t("learn.description")}
      width="narrow"
    >
      <div className="grid gap-4">
        <Explainer id="damage-rolls" title={t("learn.damageRolls.title")}>
          <Body>{t("learn.damageRolls.body1")}</Body>
          <Body>{t("learn.damageRolls.body2")}</Body>
          <DamageRollExample />
        </Explainer>

        <Explainer id="ohko" title={t("learn.ohko.title")}>
          <Body>
            {/* The 2hko anchor shares this section: the calc can link to
                either spelling and land on the same explainer. */}
            <span id="2hko" className="scroll-mt-24" />
            {t("learn.ohko.body1")}
          </Body>
          <Body>{t("learn.ohko.body2")}</Body>
        </Explainer>

        <Explainer id="stat-points" title={t("learn.statPoints.title")}>
          <Body>{t("learn.statPoints.body1")}</Body>
          <Body>{t("learn.statPoints.body2")}</Body>
        </Explainer>

        <Explainer id="speed-ties" title={t("learn.speedTies.title")}>
          <Body>{t("learn.speedTies.body1")}</Body>
          <Body>{t("learn.speedTies.body2")}</Body>
        </Explainer>
      </div>
    </Page>
  );
}

/** One explainer card with its load-bearing anchor id. */
function Explainer({
  id,
  title,
  children,
}: {
  /** One of the load-bearing anchors the calc links to. */
  id: "damage-rolls" | "ohko" | "stat-points" | "speed-ties";
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="grid gap-3 scroll-mt-24 rounded-md border bg-card p-4"
    >
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

/** Explainer body text: prose measure, relaxed leading. */
function Body({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-xl text-sm leading-relaxed sm:text-base">{children}</p>
  );
}

/** The live sample calculation under the damage-rolls explainer. */
function DamageRollExample() {
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
