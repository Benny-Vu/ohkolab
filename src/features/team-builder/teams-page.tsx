import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Page } from "@/components/page";
import { ItemIcon, PokemonSprite } from "@/components/pokemon-sprite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TeamName } from "@/features/team-builder/team-name";
import { formatDate } from "@/lib/format-date";
import { useBattleFormat } from "@/lib/preferences";
import { importTeam, sortByUpdated, useTeams } from "@/lib/team";
import { track } from "@/lib/telemetry/analytics";
import type { Team } from "@/types/team";
import { MAX_TEAM_SIZE } from "@/types/team";

function TeamCard({
  team,
  onDuplicate,
  onDelete,
  onRename,
}: {
  team: Team;
  onDuplicate: (team: Team) => void;
  onDelete: (team: Team) => void;
  onRename: (name: string) => void;
}) {
  return (
    <Card size="sm" className="flex flex-col">
      <CardHeader>
        <TeamName name={team.name} onRename={onRename} />
        <p className="text-xs text-muted-foreground">
          {team.format === "doubles" ? "Doubles" : "Singles"} ·{" "}
          {team.members.length} Pokémon · Edited {formatDate(team.updatedAt)}
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
            const member = team.members[index];
            if (!member) {
              return (
                <div
                  key={index}
                  aria-hidden="true"
                  className="size-10 rounded-md border border-dashed"
                />
              );
            }
            return (
              <div key={index} className="relative">
                <PokemonSprite species={member.species} size={40} />
                {member.item ? (
                  <ItemIcon
                    item={member.item}
                    className="absolute right-0 bottom-0 size-4 rounded-sm bg-background"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Duplicate ${team.name}`}
          onClick={() => onDuplicate(team)}
        >
          <CopyIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${team.name}`}
          onClick={() => onDelete(team)}
        >
          <Trash2Icon />
        </Button>
        <span className="flex-1" />
        <Button variant="outline" size="sm" asChild>
          <Link to={`/teams/${team.id}`}>Open</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function TeamsPage() {
  const navigate = useNavigate();
  const [preferredFormat] = useBattleFormat();
  const { teams, create, rename, duplicate, remove, restore, sync } =
    useTeams();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  function handleImport(): void {
    const imported = importTeam(importText);
    if (imported.sets.length === 0) {
      toast.error("No importable Pokémon found in that paste.");
      return;
    }
    const team = create({
      name: imported.name ?? undefined,
      format: preferredFormat,
      members: imported.sets,
    });
    track("team_imported", {
      format: preferredFormat,
      size: imported.sets.length,
    });
    setImportOpen(false);
    setImportText("");
    const suffix =
      imported.warnings.length > 0
        ? ` (${imported.warnings.length} warning${
            imported.warnings.length === 1 ? "" : "s"
          })`
        : "";
    toast.success(`Imported ${imported.sets.length} Pokémon${suffix}.`);
    navigate(`/teams/${team.id}`);
  }

  function handleDuplicate(team: Team): void {
    const copy = duplicate(team.id);
    if (copy) toast.success(`Duplicated "${team.name}".`);
  }

  function handleDelete(team: Team): void {
    remove(team.id);
    toast(`Deleted "${team.name}".`, {
      action: {
        label: "Undo",
        onClick: () => restore(team),
      },
    });
  }

  const sorted = sortByUpdated(teams);

  return (
    <Page
      title="Teams"
      description="Build, save and analyse your Pokémon Champions teams."
      actions={
        <>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <DownloadIcon />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import a team</DialogTitle>
                <DialogDescription>
                  Paste a Pokémon Showdown team export. Up to six Pokémon are
                  imported.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                aria-label="Showdown export"
                className="font-mono text-xs"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                rows={10}
                placeholder="Garchomp @ Life Orb&#10;Ability: Rough Skin&#10;Jolly Nature&#10;- Earthquake"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport}>Import team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            onClick={() => {
              track("team_created", { format: preferredFormat, size: 0 });
              navigate(`/teams/${create({ format: preferredFormat }).id}`);
            }}
          >
            <PlusIcon />
            New team
          </Button>
        </>
      }
    >
      {sync.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} size="sm">
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: MAX_TEAM_SIZE }, (_, slot) => (
                    <Skeleton key={slot} className="size-10" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sync.error ? (
        <ErrorState
          title="Teams could not be loaded"
          description={sync.error}
          action={
            <Button variant="outline" size="sm" onClick={() => sync.retry()}>
              Retry
            </Button>
          }
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Create one or import a Showdown paste to get started."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onRename={(name) => rename(team.id, name)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </Page>
  );
}
