import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { displayTeamName } from "@/lib/team/display";
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
import { useT } from "@/lib/i18n/t";
import { useBattleFormat } from "@/lib/preferences";
import { importTeam, sortByUpdated, useTeams } from "@/lib/team";
import { track } from "@/lib/telemetry/analytics";
import type { Team } from "@/types/team";
import { MAX_TEAM_SIZE } from "@/types/team";

/**
 * The card unmounts when its team is deleted, taking focus with it; park focus
 * on the page landmark so keyboard users keep their place.
 */
function focusMainLandmark(): void {
  (document.querySelector("main") as HTMLElement | null)?.focus();
}

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
  const t = useT();
  return (
    <Card size="sm" className="flex flex-col">
      <CardHeader>
        <TeamName name={team.name} onRename={onRename} />
        <p className="text-xs text-muted-foreground">
          {t("teams.cardMeta", {
            format: t(
              team.format === "doubles"
                ? "calc.formatDoubles"
                : "calc.formatSingles",
            ),
            count: team.members.length,
            date: formatDate(team.updatedAt),
          })}
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
          aria-label={t("teams.duplicateNamed", {
            name: displayTeamName(team.name),
          })}
          onClick={() => onDuplicate(team)}
        >
          <CopyIcon aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("teams.deleteNamed", {
            name: displayTeamName(team.name),
          })}
          onClick={() => onDelete(team)}
        >
          <Trash2Icon aria-hidden />
        </Button>
        <span className="flex-1" />
        <Button variant="outline" size="sm" asChild>
          <Link to={`/teams/${team.id}`}>{t("teams.open")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function TeamsPage() {
  const navigate = useNavigate();
  const t = useT();
  const [preferredFormat] = useBattleFormat();
  const { teams, create, rename, duplicate, remove, restore, sync } =
    useTeams();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  function handleImport(): void {
    const imported = importTeam(importText);
    if (imported.sets.length === 0) {
      toast.error(t("teams.importEmptyError"));
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
    toast.success(
      imported.warnings.length > 0
        ? t("teams.importedWithWarnings", {
            count: imported.sets.length,
            warningCount: imported.warnings.length,
          })
        : t("teams.imported", { count: imported.sets.length }),
    );
    navigate(`/teams/${team.id}`);
  }

  function handleDuplicate(team: Team): void {
    const copy = duplicate(team.id);
    if (copy) {
      toast.success(
        t("teams.duplicated", { name: displayTeamName(team.name) }),
      );
    }
  }

  function handleDelete(team: Team): void {
    remove(team.id);
    focusMainLandmark();
    toast(t("teams.deleted", { name: displayTeamName(team.name) }), {
      action: {
        label: t("teams.undo"),
        onClick: () => restore(team),
      },
    });
  }

  const sorted = sortByUpdated(teams);

  return (
    <Page
      title={t("teams.title")}
      description={t("teams.description")}
      actions={
        <>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <DownloadIcon aria-hidden />
                {t("teams.import")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("teams.importTitle")}</DialogTitle>
                <DialogDescription>
                  {t("teams.importDescription")}
                </DialogDescription>
              </DialogHeader>
              <Textarea
                aria-label={t("teams.showdownExport")}
                className="font-mono text-xs"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                rows={10}
                placeholder="Garchomp @ Life Orb&#10;Ability: Rough Skin&#10;Jolly Nature&#10;- Earthquake"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleImport}>{t("teams.importTeam")}</Button>
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
            <PlusIcon aria-hidden />
            {t("teams.newTeam")}
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
          title={t("teams.loadError")}
          description={sync.error}
          action={
            <Button variant="outline" size="sm" onClick={() => sync.retry()}>
              {t("teams.retry")}
            </Button>
          }
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          title={t("teams.empty")}
          description={t("teams.emptyDescription")}
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
