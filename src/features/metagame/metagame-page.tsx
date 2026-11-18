import { lazy, Suspense, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useBattleFormat } from "@/lib/preferences";
import { findSnapshot, listSnapshots } from "@/lib/metagame/snapshots";
import {
  formatAttribution,
  formatBattles,
  formatPeriod,
  formatShare,
} from "@/lib/metagame/format";
import type { PokemonUsage } from "@/lib/metagame/types";
import { STAT_IDS, STAT_LABELS } from "@/types/pokemon";

// Speed tiers need the dex (calcStat), so the section lives in its own
// module and loads lazily; the /meta route chunk stays dex-free.
const SpeedTiersSection = lazy(() =>
  import("@/features/metagame/speed-tiers-section").then((m) => ({
    default: m.SpeedTiersSection,
  })),
);

function ShareList({ shares }: { shares: { name: string; share: number }[] }) {
  if (shares.length === 0) {
    return <p className="text-sm text-muted-foreground">No data.</p>;
  }
  return (
    <ul className="space-y-1">
      {shares.map((share) => (
        <li
          key={share.name}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span className="min-w-0 truncate">{share.name}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
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
    <ul className="space-y-1">
      {spreads.map((spread, index) => (
        <li
          key={`${spread.nature}-${index}`}
          className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm"
        >
          <span className="min-w-0">
            <span className="font-medium">{spread.nature}</span>{" "}
            <span className="text-muted-foreground">
              {STAT_IDS.map(
                (stat) => `${STAT_LABELS[stat]} ${spread.statPoints[stat]}`,
              ).join(" / ")}
            </span>
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {formatShare(spread.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PokemonDetail({
  pokemon,
  onUseSet,
}: {
  pokemon: PokemonUsage;
  onUseSet: (pokemon: PokemonUsage) => void;
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
        <Button onClick={() => onUseSet(pokemon)}>Use this set</Button>
      </DialogFooter>
    </div>
  );
}

export function MetagamePage() {
  const [format] = useBattleFormat();
  const navigate = useNavigate();
  const index = useMetagameIndex();
  const [period, setPeriod] = useState<string | null>(null);
  const [selected, setSelected] = useState<PokemonUsage | null>(null);

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

  const handleUseSet = async (pokemon: PokemonUsage) => {
    // usageToSet needs the dex; import it on demand so the route stays light.
    const { usageToSet } = await import("@/lib/metagame/sets");
    const set = usageToSet(pokemon);
    if (set) {
      navigate("/calc", { state: { attacker: set } });
    } else {
      toast.error("Could not build a set from this usage entry.");
    }
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
      <Alert>
        <InfoIcon />
        <AlertTitle>Could not load metagame data</AlertTitle>
        <AlertDescription>
          The metagame index could not be loaded.{" "}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => index.refetch()}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (choice === null) {
    content = (
      <p className="text-sm text-muted-foreground">
        No data for this format yet.
      </p>
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
      <Alert>
        <InfoIcon />
        <AlertTitle>Could not load metagame data</AlertTitle>
        <AlertDescription>
          The snapshot for this month could not be loaded.{" "}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => snapshot.refetch()}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else {
    const data = snapshot.data;
    content = (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{formatAttribution(data)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatBattles(data.battles)} battles</span>
        </div>
        <Alert>
          <InfoIcon />
          <AlertTitle>Showdown ladder data</AlertTitle>
          <AlertDescription>
            Usage numbers come from the Pokémon Showdown ladder, not in-game
            data.
          </AlertDescription>
        </Alert>
        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Usage ranking
          </h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Pokémon</TableHead>
                  <TableHead className="text-right">Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pokemon.map((pokemon) => (
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
                    <TableCell className="text-right tabular-nums">
                      {formatShare(pokemon.usage)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <SpeedTiersSection pokemon={data.pokemon} />
        </Suspense>
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
          <Select
            value={snapshot.data?.period ?? monthOptions[0]?.period ?? ""}
            onValueChange={(value) => setPeriod(value)}
          >
            <SelectTrigger size="sm" className="min-w-28" aria-label="Month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.period} value={option.period}>
                  {formatPeriod(option.period)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <DialogContent className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
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
              <PokemonDetail pokemon={selected} onUseSet={handleUseSet} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
