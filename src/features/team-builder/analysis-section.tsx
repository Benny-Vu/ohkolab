import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDisplayName } from "@/data/display-names";
import { SpeedTiers } from "@/features/team-builder/speed-tiers";
import { TypeHeatMap } from "@/features/team-builder/type-heat-map";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import {
  coverageGaps,
  defensiveWeakSpots,
  offensiveCoverage,
  teamWarnings,
  type TeamWarning,
} from "@/lib/team";
import { TYPE_NAMES, type PokemonSet } from "@/types/pokemon";

const WARNING_TITLE_KEYS: Record<TeamWarning["kind"], TranslationKey> = {
  "duplicate-species": "teams.warningDuplicateSpecies",
  "duplicate-item": "teams.warningDuplicateItem",
  set: "teams.warningSet",
};

/** Weaknesses shared by this many members are the team's real problem. */
const SHARED_WEAKNESS_THRESHOLD = 3;

interface AnalysisSectionProps {
  members: PokemonSet[];
}

function Warnings({ members }: { members: PokemonSet[] }) {
  const t = useT();
  const warnings = teamWarnings(members);
  if (warnings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {warnings.map((warning, index) => (
        <Alert key={index} variant="destructive">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>{t(WARNING_TITLE_KEYS[warning.kind])}</AlertTitle>
          <AlertDescription>
            {t(warning.message.key, warning.message.params)}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

function WeakSpots({ members }: { members: PokemonSet[] }) {
  const t = useT();
  const displayName = useDisplayName();
  const weakSpots = defensiveWeakSpots(members);
  if (weakSpots.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {weakSpots.map((spot) => {
        const severe = spot.weak >= SHARED_WEAKNESS_THRESHOLD;
        const sentence = spot.noResist
          ? t("teams.weakSpotNoResist", {
              count: spot.weak,
              type: displayName("type", spot.type),
            })
          : t("teams.weakSpot", {
              count: spot.weak,
              type: displayName("type", spot.type),
            });
        return (
          <p
            key={spot.type}
            className={`flex items-center gap-1.5 text-sm ${
              severe ? "font-medium text-destructive" : ""
            }`}
          >
            {severe && <TriangleAlertIcon className="size-4" aria-hidden />}
            {sentence}
          </p>
        );
      })}
    </div>
  );
}

function CoverageSummary({ members }: { members: PokemonSet[] }) {
  const t = useT();
  const displayName = useDisplayName();
  const coverage = offensiveCoverage(members);
  // Nothing to measure until the team has a damaging move.
  if (!coverage.some((entry) => entry.best !== null)) return null;
  const gaps = coverageGaps(members);
  const covered = coverage.filter(
    (entry) => entry.best !== null && entry.best >= 2,
  ).length;
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-sm font-medium">{t("teams.coverageTitle")}</h4>
      <p className="text-sm text-muted-foreground">
        {t("teams.coverageCount", {
          count: covered,
          total: TYPE_NAMES.length,
        })}
      </p>
      {gaps.length === 0 ? (
        <p className="text-sm">{t("teams.coverageComplete")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {gaps.map((gap) => (
            <li
              key={gap.type}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <TriangleAlertIcon
                className="size-3.5 shrink-0 text-destructive"
                aria-hidden
              />
              {t("teams.coverageGap", {
                type: displayName("type", gap.type),
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The analysis card's content: team warnings, shared weaknesses, the
 * defense/offense type heat maps, offensive coverage gaps and the speed
 * tiers. Loaded lazily by the team detail page so the team routes chunk
 * stays free of the heavy analysis tables.
 */
export function AnalysisSection({ members }: AnalysisSectionProps) {
  const t = useT();
  return (
    <CardContent className="flex flex-col gap-4">
      <Warnings members={members} />
      <WeakSpots members={members} />
      <Tabs defaultValue="defense">
        <TabsList>
          <TabsTrigger value="defense">{t("teams.defense")}</TabsTrigger>
          <TabsTrigger value="offense">{t("teams.offense")}</TabsTrigger>
        </TabsList>
        <TabsContent value="defense">
          <TypeHeatMap members={members} mode="defense" />
        </TabsContent>
        <TabsContent value="offense">
          <div className="flex flex-col gap-3">
            <TypeHeatMap members={members} mode="offense" />
            <CoverageSummary members={members} />
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t("teams.speedTiers")}</h3>
        <SpeedTiers members={members} />
      </div>
    </CardContent>
  );
}
