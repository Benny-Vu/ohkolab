import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Page } from "@/components/page";
import { Picker } from "@/components/picker";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { StatBar } from "@/components/stat-bar";
import { Button } from "@/components/ui/button";
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
import {
  useMetagameIndex,
  useMetagameSnapshot,
} from "@/features/metagame/use-metagame";
import {
  formatAttribution,
  formatBattles,
  formatPeriod,
  formatShare,
} from "@/lib/metagame/format";
import { findSnapshot, listSnapshots } from "@/lib/metagame/snapshots";
import type { PokemonUsage } from "@/lib/metagame/types";
import { useBattleFormat } from "@/lib/preferences";
import { track } from "@/lib/telemetry/analytics";
import { useTeams } from "@/lib/team/use-teams";
import { STAT_IDS, STAT_LABELS } from "@/types/pokemon";

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
      className={`inline-flex h-6 items-center gap-1 rounded-md px-1 text-xs font-medium transition-colors duration-150 ease-out ${
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

function ShareList({ shares }: { shares: { name: string; share: number }[] }) {
  if (shares.length === 0) {
    return <p className="text-sm text-muted-foreground">No data.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {shares.map((share) => (
        <li key={share.name} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">{share.name}</span>
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
  if (spreads.length === 0) {
    return <p className="text-sm text-muted-foreground">No data.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {spreads.map((spread, index) => (
        <li
          key={`${spread.nature}-${index}`}
          className="flex flex-wrap items-center gap-x-2 gap-y-1"
        >
          <span className="min-w-40 flex-1 text-sm">
            <span className="font-medium">{spread.nature}</span>{" "}
            <span className="text-muted-foreground">
              {STAT_IDS.map(
                (stat) => `${STAT_LABELS[stat]} ${spread.statPoints[stat]}`,
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
  return (
    <div className="space-y-4">
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">Moves</h3>
        <ShareList shares={pokemon.moves} />
      </section>
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">Items</h3>
        <ShareList shares={pokemon.items} />
      </section>
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">Abilities</h3>
        <ShareList shares={pokemon.abilities} />
      </section>
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">Teammates</h3>
        <ShareList shares={pokemon.teammates} />
      </section>
      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">Spreads</h3>
        <SpreadList spreads={pokemon.spreads} />
      </section>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => onAddToTeam(pokemon)}>
          Add to a team
        </Button>
        <Button onClick={() => onOpenInCalc(pokemon)}>Open in calc</Button>
      </DialogFooter>
    </div>
  );
}

export function MetagamePage() {
  const [format] = useBattleFormat();
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
      toast.error("Could not build a set from this usage entry.");
    }
  };

  const handleAddToTeam = async (pokemon: PokemonUsage) => {
    const { usageToSet } = await import("@/lib/metagame/sets");
    const set = usageToSet(pokemon);
    if (!set) {
      toast.error("Could not build a set from this usage entry.");
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
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  } else if (index.isError) {
    content = (
      <ErrorState
        title="Could not load metagame data"
        description="The metagame index could not be loaded."
        action={
          <Button variant="outline" size="sm" onClick={() => index.refetch()}>
            Retry
          </Button>
        }
      />
    );
  } else if (choice === null) {
    content = (
      <EmptyState
        title="No data for this format yet"
        description="Usage snapshots appear here once the ladder data is published."
      />
    );
  } else if (snapshot.isPending) {
    content = (
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  } else if (snapshot.isError) {
    content = (
      <ErrorState
        title="Could not load metagame data"
        description="The snapshot for this month could not be loaded."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => snapshot.refetch()}
          >
            Retry
          </Button>
        }
      />
    );
  } else {
    const data = snapshot.data;
    const query = search.trim().toLowerCase();
    const visible = data.pokemon
      .filter((pokemon) => pokemon.species.toLowerCase().includes(query))
      .sort((a, b) => comparePokemon(a, b, sort.key, sort.dir));

    content = (
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-sm text-muted-foreground">
            {formatBattles(data.battles)} battles
          </p>
          <p className="text-sm text-muted-foreground">
            Regulation{" "}
            <span className="font-medium text-foreground">
              {data.regulation}
            </span>
          </p>
        </div>
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base leading-tight font-semibold">
              Usage ranking
            </h2>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Pokémon"
              aria-label="Search Pokémon"
              className="w-full sm:w-48"
            />
          </div>
          {data.pokemon.length === 0 ? (
            <EmptyState title="No usage data" />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No matches"
              description={`No Pokémon match "${search.trim()}".`}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                >
                  Clear search
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
                        label="Rank"
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
                        label="Pokémon"
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
                        label="Usage"
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          className="h-8"
                          onClick={() => setSelected(pokemon)}
                        >
                          <PokemonIcon
                            species={pokemon.species}
                            className="size-6"
                          />
                          <span className="min-w-0 font-medium">
                            {pokemon.species}
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <StatBar
                            value={(pokemon.usage ?? 0) * 100}
                            max={100}
                            tone="accent"
                            className="w-16 sm:w-24"
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
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
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
      title="Metagame"
      description={
        snapshot.data ? formatPeriod(snapshot.data.period) : undefined
      }
      actions={
        <>
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
            placeholder="Month"
            aria-label="Month"
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
                  <PokemonIcon species={selected.species} className="size-8" />
                  <span>{selected.species}</span>
                </DialogTitle>
                <DialogDescription>
                  Rank #{selected.rank} · {formatShare(selected.usage)} usage
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
