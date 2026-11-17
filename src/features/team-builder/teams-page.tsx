import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  CopyIcon,
  DownloadIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";

import { Page } from "@/components/page";
import { PokemonSprite } from "@/components/pokemon-sprite";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useBattleFormat } from "@/lib/preferences";
import { importTeam, sortByUpdated, useTeams } from "@/lib/team";
import type { Team } from "@/types/team";

export function TeamsPage() {
  const navigate = useNavigate();
  const [preferredFormat] = useBattleFormat();
  const { teams, create, duplicate, remove, restore, sync } = useTeams();
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
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                rows={10}
                placeholder="Garchomp @ Life Orb&#10;Ability: Rough Skin&#10;Jolly Nature&#10;- Earthquake"
              />
              <DialogFooter>
                <Button onClick={handleImport}>Import team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            onClick={() =>
              navigate(`/teams/${create({ format: preferredFormat }).id}`)
            }
          >
            <PlusIcon />
            New team
          </Button>
        </>
      }
    >
      {sync.loading ? (
        <p className="text-muted-foreground">Loading your teams…</p>
      ) : sync.error ? (
        <div className="grid gap-4">
          <Alert>
            <TriangleAlertIcon />
            <AlertTitle>Teams could not be loaded</AlertTitle>
            <AlertDescription>{sync.error}</AlertDescription>
          </Alert>
          <Button className="justify-self-start" onClick={() => sync.retry()}>
            Retry
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground">
          No teams yet. Create one or import a Showdown paste to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((team) => (
            <Card key={team.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>
                  <Link to={`/teams/${team.id}`} className="hover:text-primary">
                    {team.name}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {team.format === "doubles" ? "Doubles" : "Singles"} ·{" "}
                  {team.members.length} Pokémon
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {team.members.map((member, index) => (
                    <PokemonSprite
                      key={`${member.species}-${index}`}
                      species={member.species}
                      size={40}
                    />
                  ))}
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 border-t bg-muted/50 p-4">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Duplicate ${team.name}`}
                  onClick={() => handleDuplicate(team)}
                >
                  <CopyIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${team.name}`}
                  onClick={() => handleDelete(team)}
                >
                  <Trash2Icon />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/teams/${team.id}`}>Open</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
