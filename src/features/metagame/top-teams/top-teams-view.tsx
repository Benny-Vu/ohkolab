import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SegmentedControl } from "@/components/segmented-control";
import { TeamPreview } from "@/components/team-preview/team-preview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTENT_FADE_IN, LoadingArea } from "@/components/skeletons";
import {
  buttonSmTouchClass,
  buttonTouchClass,
} from "@/components/touch-targets";
import { useMetagameSnapshot } from "@/features/metagame/use-metagame";
import { formatDate } from "@/lib/format-date";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";
import type { TopTeam } from "@/lib/top-teams/types";
import { useTopTeams } from "@/lib/top-teams/use-top-teams";
import type { PokemonSet } from "@/types/pokemon";

import {
  buildTopTeamSets,
  buildUsageIndex,
  playersText,
  recordText,
} from "@/features/metagame/top-teams/build";
import { TeamDetailDialog } from "@/features/metagame/top-teams/team-detail-dialog";

/**
 * The /meta "Top teams" view: the placing teams from published Limitless
 * tournaments, as team cards with a regulation filter. The sheet publishes
 * no player names or countries by design — the source link on each team's
 * detail carries them — and no Stat Points, so every set the view builds
 * borrows its SP spread and says so.
 */

/** Regulation chips run newest first; `all` is the whole snapshot. */
const FORMAT_ORDER = ["M-C", "M-B", "M-A"] as const;

/** The filter's "every format" value. */
const ALL_FORMATS = "all";

/** How many team cards render at a time. The real snapshot holds
 * thousands of teams, so the grid grows on demand instead of at once. */
const PAGE_SIZE = 12;

/** Newest event first, and by placing within an event. */
function sortTeams(teams: readonly TopTeam[]): TopTeam[] {
  return [...teams].sort((a, b) =>
    a.date === b.date ? a.placing - b.placing : b.date.localeCompare(a.date),
  );
}

/** The regulation filter: All plus every format the snapshot has. */
function FormatFilter({
  formats,
  value,
  onChange,
}: {
  formats: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const options = [
    { value: ALL_FORMATS, label: t("meta.allFormats") },
    ...formats.map((format) => ({ value: format, label: format })),
  ];
  // The shared one-row switch (as Singles/Doubles in the calc): a hand-made
  // grid here wrapped 2 + 1 on phones and shrank to a sliver on desktop.
  return (
    <SegmentedControl
      options={options}
      value={value}
      onValueChange={onChange}
      aria-label={t("meta.formatFilter")}
      className="self-start"
    />
  );
}

/** One team as a card: the six sprites, then the event line. */
function TeamCard({
  team,
  members,
  onOpen,
}: {
  team: TopTeam;
  members: readonly PokemonSet[];
  onOpen: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 rounded-lg border bg-card p-3 text-left transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-accent-brand-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand-text"
    >
      <TeamPreview team={{ members: [...members] }} variant="compact" />
      <div className="space-y-1">
        <p className="text-sm leading-tight font-medium">{team.event}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("meta.placing", { placing: team.placing })}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(team.date)}</span>
          <span aria-hidden="true">·</span>
          <span>{recordText(t, team)}</span>
          <span aria-hidden="true">·</span>
          <span>{playersText(t, team)}</span>
        </div>
        <span className="inline-flex h-5 items-center rounded-md bg-surface-sunken px-1.5 text-xs font-medium text-muted-foreground">
          {team.format}
        </span>
      </div>
    </button>
  );
}

export function TopTeamsView() {
  const t = useT();
  const query = useTopTeams();
  // The doubles snapshot's spreads are where a built set borrows its SP
  // from; without it (still loading, no snapshot) the sets stay honest
  // with the neutral default and the `meta.spAssumed` line.
  const usageSnapshot = useMetagameSnapshot("doubles", null);
  const [requestedFormat, setRequestedFormat] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<TopTeam | null>(null);

  const usageBySpecies = useMemo(
    () => buildUsageIndex(usageSnapshot.data?.pokemon),
    [usageSnapshot.data],
  );

  if (query.isPending) {
    return (
      <LoadingArea
        pending={true}
        label={t("meta.topTeamsLoading")}
        skeleton={<Skeleton className="h-40 w-full" />}
      />
    );
  }
  if (query.isError) {
    return (
      <ErrorState
        title={t("meta.topTeamsError")}
        action={
          <Button
            variant="outline"
            size="sm"
            className={buttonSmTouchClass}
            onClick={() => query.refetch()}
          >
            {t("meta.topTeamsRetry")}
          </Button>
        }
      />
    );
  }

  const teams = query.data?.teams ?? [];
  if (teams.length === 0) {
    return <EmptyState title={t("meta.topTeamsEmpty")} />;
  }

  const formats = FORMAT_ORDER.filter((format) =>
    teams.some((team) => team.format === format),
  );
  // The default is the latest regulation that has teams, until the player
  // picks one; their choice then sticks.
  const filter = requestedFormat ?? formats[0] ?? ALL_FORMATS;
  const visible = sortTeams(
    teams.filter((team) => filter === ALL_FORMATS || team.format === filter),
  );
  // Only the first `visibleCount` render; the button below grows it.
  const shown = visible.slice(0, visibleCount);

  return (
    <div className={cn("space-y-6", CONTENT_FADE_IN)}>
      <FormatFilter
        formats={formats}
        value={filter}
        onChange={(value) => {
          setRequestedFormat(value);
          setVisibleCount(PAGE_SIZE);
        }}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((team) => (
          <TeamCard
            key={`${team.eventId}-${team.placing}`}
            team={team}
            members={buildTopTeamSets(team, usageBySpecies).map(
              (entry) => entry.set,
            )}
            onOpen={() => setSelected(team)}
          />
        ))}
      </div>
      {visible.length > shown.length ? (
        <Button
          variant="outline"
          className={buttonTouchClass}
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          {t("meta.showMore")}
        </Button>
      ) : null}
      <footer>
        <p className="text-xs text-muted-foreground">
          {t("meta.topTeamsAttribution")}
        </p>
      </footer>
      <TeamDetailDialog
        team={selected}
        usageBySpecies={usageBySpecies}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
