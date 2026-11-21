import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { DataBadge } from "@/components/data-badge";
import { Page } from "@/components/page";
import { Picker } from "@/components/picker";
import {
  CONTENT_FADE_IN,
  LoadingArea,
  MetagameSkeleton,
} from "@/components/skeletons";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { StatBar } from "@/components/stat-bar";
import { Button } from "@/components/ui/button";
import {
  buttonSmTouchClass,
  buttonTouchClass,
} from "@/components/touch-targets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormatToggle } from "@/features/metagame/format-toggle";
import { statLabel } from "@/components/stat-labels";
import {
  matchesDisplayName,
  useDisplayName,
  type NameKind,
} from "@/data/display-names";
import { useLocale } from "@/lib/i18n/locale";
import {
  useMetagameIndex,
  useMetagameSnapshot,
} from "@/features/metagame/use-metagame";
import {
  formatAttribution,
  formatPeriod,
  formatShare,
} from "@/lib/metagame/format";
import { findSnapshot, listSnapshots } from "@/lib/metagame/snapshots";
import type { PokemonUsage } from "@/lib/metagame/types";
import { formatNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/t";
import { useBattleFormat } from "@/lib/preferences";
import { track } from "@/lib/telemetry/analytics";
import { useTeams } from "@/lib/team/use-teams";
import { STAT_IDS } from "@/types/pokemon";

// Speed tiers need the dex (calcStat), so the section lives in its own
// module and loads lazily; the /meta route chunk stays dex-free.
const SpeedTiersSection = lazy(() =>
  import("@/features/metagame/speed-tiers-section").then((m) => ({
    default: m.SpeedTiersSection,
  })),
);

type SortKey = "rank" | "name" | "usage";
type SortDir = "asc" | "desc";

const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  rank: "asc",
  name: "asc",
  usage: "desc",
};

function comparePokemon(
  a: PokemonUsage,
  b: PokemonUsage,
  key: SortKey,
  dir: SortDir,
) {
  const result =
    key === "name"
      ? a.species.localeCompare(b.species)
      : key === "usage"
        ? (a.usage ?? 0) - (b.usage ?? 0)
        : a.rank - b.rank;
  return dir === "asc" ? result : -result;
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const Icon = !active
    ? ArrowUpDownIcon
    : dir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-6 items-center gap-1 rounded-md px-1 text-xs font-medium transition-colors duration-(--motion-fast) ease-(--motion-ease-out) relative after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] ${
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <Icon className="size-3" aria-hidden="true" />
    </button>
  );
}

function ShareList({
  kind,
  shares,
}: {
  kind: NameKind;
  shares: { name: string; share: number }[];
}) {
  const t = useT();
  const displayName = useDisplayName();
  if (shares.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("meta.noData")}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {shares.map((share) => (
        <li key={share.name} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">
            {displayName(kind, share.name)}
          </span>
          <StatBar
            value={share.share * 100}
            max={100}
            tone="accent"
            className="w-16 shrink-0 sm:w-24"
          />
          <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {formatShare(share.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SpreadList({ spreads }: { spreads: PokemonUsage["spreads"] }) {
  const t = useT();
  const displayName = useDisplayName();
  if (spreads.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("meta.noData")}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {spreads.map((spread, index) => (
        <li
          key={`${spread.nature}-${index}`}
          className="flex flex-wrap items-center gap-x-2 gap-y-1"
        >
          <span className="min-w-40 flex-1 text-sm">
            <span className="font-medium">
              {displayName("nature", spread.nature)}
            </span>{" "}
            <span className="text-muted-foreground">
              {STAT_IDS.map(
                (stat) => `${statLabel(t, stat)} ${spread.statPoints[stat]}`,
              ).join(" / ")}
            </span>
          </span>
          <StatBar
            value={spread.share * 100}
            max={100}
            tone="accent"
            className="w-16 shrink-0 sm:w-24"
          />
          <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {formatShare(spread.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PokemonDetail({
  pokemon,
  onClose,
  onOpenInCalc,
  onAddToTeam,
}: {
  pokemon: PokemonUsage;
  onClose: () => void;
  onOpenInCalc: (pokemon: PokemonUsage) => void;
  onAddToTeam: (pokemon: PokemonUsage) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      <section className="space-y-1.5">
        <h3 className="font-heading text-sm font-semibold">
          {t("meta.moves")}
        </h3>
        <ShareList kind="move" shares={pokemon.moves} />
      </section>
      <section className="space-y-1.5">
        <h3 className="font-heading text-sm font-semibold">
          {t("meta.items")}
        </h3>
        <ShareList kind="item" shares={pokemon.items} />
      </section>
      <section className="space-y-1.5">
        <h3 className="font-heading text-sm font-semibold">
          {t("meta.abilities")}
        </h3>
        <ShareList kind="ability" shares={pokemon.abilities} />
      </section>
      <section className="space-y-1.5">
        <h3 className="font-heading text-sm font-semibold">
          {t("meta.teammates")}
        </h3>
        <ShareList kind="species" shares={pokemon.teammates} />
      </section>
      <section className="space-y-1.5">
        <h3 className="font-heading text-sm font-semibold">
          {t("meta.spreads")}
        </h3>
        <SpreadList spreads={pokemon.spreads} />
      </section>
      <DialogFooter>
        <Button
          variant="outline"
          className={buttonTouchClass}
          onClick={onClose}
        >
          {t("common.cancel")}
        </Button>
        <Button
          variant="secondary"
          className={buttonTouchClass}
          onClick={() => onAddToTeam(pokemon)}
        >
          {t("meta.addToTeam")}
        </Button>
        <Button
          className={buttonTouchClass}
          onClick={() => onOpenInCalc(pokemon)}
        >
          {t("meta.openInCalc")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function MetagamePage() {
  const [format] = useBattleFormat();
  const t = useT();
  const [locale] = useLocale();
  const displayName = useDisplayName();
  const navigate = useNavigate();
  const index = useMetagameIndex();
  const { create } = useTeams();
  const [period, setPeriod] = useState<string | null>(null);
  const [selected, setSelected] = useState<PokemonUsage | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "rank",
    dir: "asc",
  });

  // Reset the month when the format changes (adjust state during render).
  const [lastFormat, setLastFormat] = useState(format);
  if (lastFormat !== format) {
    setLastFormat(format);
    setPeriod(null);
  }

  const monthOptions = index.data ? listSnapshots(index.data, format) : [];
  const choice =
    index.data && !index.isError
      ? findSnapshot(index.data, format, period)
      : null;
  const snapshot = useMetagameSnapshot(format, period);

  useEffect(() => {
    if (snapshot.data) {
      track("metagame_viewed", {
        format,
        month: snapshot.data.period,
      });
    }
  }, [snapshot.data, format]);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: DEFAULT_SORT_DIR[key] },
    );
  };

  const handleOpenInCalc = async (pokemon: PokemonUsage) => {
    // usageToSet needs the dex; import it on demand so the route stays light.
    const { usageToSet } = await import("@/lib/metagame/sets");
    const set = usageToSet(pokemon);
    if (set) {
      navigate("/calc", { state: { attacker: set } });
    } else {
      toast.error(t("meta.setBuildFailed"));
    }
  };

  const handleAddToTeam = async (pokemon: PokemonUsage) => {
    const { usageToSet } = await import("@/lib/metagame/sets");
    const set = usageToSet(pokemon);
    if (!set) {
      toast.error(t("meta.setBuildFailed"));
      return;
    }
    const team = create({
      name: pokemon.species,
      format,
      members: [set],
    });
    navigate(`/teams/${team.id}`);
  };

  let content: ReactNode;
  if (index.isPending) {
    content = (
      <LoadingArea
        pending={true}
        label={t("meta.loadingAria")}
        skeleton={<MetagameSkeleton />}
      />
    );
  } else if (index.isError) {
    content = (
      <ErrorState
        title={t("meta.loadError")}
        description={t("meta.loadErrorIndex")}
        action={
          <Button
            variant="outline"
            size="sm"
            className={buttonSmTouchClass}
            onClick={() => index.refetch()}
          >
            {t("meta.retry")}
          </Button>
        }
      />
    );
  } else if (choice === null) {
    content = (
      <EmptyState
        title={t("meta.emptyTitle")}
        description={t("meta.emptyDescription")}
      />
    );
  } else if (snapshot.isPending) {
    content = (
      <LoadingArea
        pending={true}
        label={t("meta.loadingAria")}
        skeleton={<MetagameSkeleton />}
      />
    );
  } else if (snapshot.isError) {
    content = (
      <ErrorState
        title={t("meta.loadError")}
        description={t("meta.loadErrorSnapshot")}
        action={
          <Button
            variant="outline"
            size="sm"
            className={buttonSmTouchClass}
            onClick={() => snapshot.refetch()}
          >
            {t("meta.retry")}
          </Button>
        }
      />
    );
  } else {
    const data = snapshot.data;
    const query = search.trim().toLowerCase();
    // In Japanese the search matches the Japanese name too; in English the
    // filter stays a plain substring match so the behaviour does not change.
    const matches = (species: string) =>
      locale === "ja"
        ? matchesDisplayName(query, species, displayName("species", species))
        : species.toLowerCase().includes(query);
    const visible = data.pokemon
      .filter((pokemon) => matches(pokemon.species))
      .sort((a, b) => comparePokemon(a, b, sort.key, sort.dir));

    content = (
      <div className={cn("space-y-6", CONTENT_FADE_IN)}>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-sm text-muted-foreground">
            {t("meta.battles", { count: formatNumber(data.battles) })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("meta.regulation")}{" "}
            <span className="font-medium text-foreground">
              {data.regulation}
            </span>
          </p>
        </div>
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-base leading-tight font-semibold">
              {t("meta.usageRanking")}
            </h2>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("meta.searchPokemon")}
              aria-label={t("meta.searchPokemon")}
              className="w-full sm:w-48"
            />
          </div>
          {data.pokemon.length === 0 ? (
            <EmptyState title={t("meta.noUsageData")} />
          ) : visible.length === 0 ? (
            <EmptyState
              title={t("meta.noMatches")}
              description={t("meta.noMatchesDescription", {
                query: search.trim(),
              })}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className={buttonSmTouchClass}
                  onClick={() => setSearch("")}
                >
                  {t("meta.clearSearch")}
                </Button>
              }
            />
          ) : (
            <div className="rounded-lg border">
              <Table density="dense">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-12"
                      aria-sort={
                        sort.key === "rank"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortButton
                        label={t("meta.rank")}
                        active={sort.key === "rank"}
                        dir={sort.dir}
                        onClick={() => toggleSort("rank")}
                      />
                    </TableHead>
                    <TableHead
                      aria-sort={
                        sort.key === "name"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortButton
                        label={t("meta.pokemon")}
                        active={sort.key === "name"}
                        dir={sort.dir}
                        onClick={() => toggleSort("name")}
                      />
                    </TableHead>
                    <TableHead
                      className="text-right"
                      aria-sort={
                        sort.key === "usage"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortButton
                        label={t("meta.usage")}
                        active={sort.key === "usage"}
                        dir={sort.dir}
                        onClick={() => toggleSort("usage")}
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((pokemon) => (
                    <TableRow key={pokemon.species}>
                      <TableCell className="tabular-nums">
                        {pokemon.rank}
                      </TableCell>
                      <TableCell className="w-full max-w-0">
                        <Button
                          variant="ghost"
                          className="h-8 max-w-full justify-start max-sm:h-11"
                          onClick={() => setSelected(pokemon)}
                        >
                          <span aria-hidden className="shrink-0">
                            <PokemonIcon
                              species={pokemon.species}
                              className="size-6"
                            />
                          </span>
                          {/* Wraps instead of truncating: at 360px a cut name
                              loses the suffix that tells Mega X from Mega Y. */}
                          <span className="line-clamp-2 min-w-0 text-left leading-tight font-medium break-words whitespace-normal">
                            {displayName("species", pokemon.species)}
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <StatBar
                            value={(pokemon.usage ?? 0) * 100}
                            max={100}
                            tone="accent"
                            className="hidden w-16 sm:block sm:w-24"
                          />
                          <span className="font-heading text-sm font-semibold tabular-nums">
                            {formatShare(pokemon.usage)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
        <Suspense
          fallback={
            <LoadingArea
              pending={true}
              label={t("meta.loadingAria")}
              skeleton={<Skeleton className="h-40 w-full" />}
            />
          }
        >
          <SpeedTiersSection pokemon={data.pokemon} />
        </Suspense>
        <footer>
          <p className="text-xs text-muted-foreground">
            {formatAttribution(data)}
          </p>
        </footer>
      </div>
    );
  }

  return (
    <Page
      title={t("meta.title")}
      description={
        snapshot.data ? formatPeriod(snapshot.data.period) : undefined
      }
      actions={
        <>
          <DataBadge period={period} />
          <FormatToggle />
          <Picker
            options={monthOptions.map((option) => ({
              value: option.period,
              label: formatPeriod(option.period),
              description: option.regulation,
            }))}
            value={snapshot.data?.period ?? monthOptions[0]?.period ?? ""}
            onValueChange={(value) => {
              if (value) setPeriod(value);
            }}
            placeholder={t("meta.month")}
            aria-label={t("meta.month")}
            className="w-36"
            disabled={monthOptions.length === 0}
          />
        </>
      }
    >
      {content}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span aria-hidden className="shrink-0">
                    <PokemonIcon
                      species={selected.species}
                      className="size-8"
                    />
                  </span>
                  <span>{displayName("species", selected.species)}</span>
                </DialogTitle>
                <DialogDescription>
                  {t("meta.rankUsage", {
                    rank: selected.rank,
                    usage: formatShare(selected.usage),
                  })}
                </DialogDescription>
              </DialogHeader>
              <PokemonDetail
                pokemon={selected}
                onClose={() => setSelected(null)}
                onOpenInCalc={handleOpenInCalc}
                onAddToTeam={handleAddToTeam}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
