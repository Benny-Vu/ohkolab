import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { DemoTeamGrid } from "@/components/demo-team-grid";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import {
  CONTENT_FADE_IN,
  LoadingArea,
  TeamGridSkeleton,
} from "@/components/skeletons";
import { displayTeamName } from "@/lib/team/display";
import { Page } from "@/components/page";
import { ItemIcon, PokemonSprite } from "@/components/pokemon-sprite";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { TeamName } from "@/features/team-builder/team-name";
import { TeamPreviewPanel } from "@/features/team-builder/team-preview-panel";
import { formatDate } from "@/lib/format-date";
import { isDemoMode } from "@/lib/demo-mode";
import { useT } from "@/lib/i18n/t";
import { useBattleFormat } from "@/lib/preferences";
import { importTeam, sortByUpdated, useTeams } from "@/lib/team";
import { cn } from "@/lib/utils";
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
  onSelect,
}: {
  team: Team;
  onDuplicate: (team: Team) => void;
  onDelete: (team: Team) => void;
  onRename: (name: string) => void;
  /** Opens the team's preview panel. */
  onSelect: (team: Team) => void;
}) {
  const t = useT();
  return (
    <Card size="sm" className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <TeamName name={team.name} onRename={onRename} />
          {team.gameTeamId ? (
            <Badge variant="outline" className="shrink-0">
              {t("teams.gameIdBadge")}
            </Badge>
          ) : null}
        </div>
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
        <button
          type="button"
          className="w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-accent-brand-text"
          aria-label={t("teams.previewNamed", {
            name: displayTeamName(team.name),
          })}
          onClick={() => onSelect(team)}
        >
          <span className="grid grid-cols-6 gap-1">
            {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
              const member = team.members[index];
              if (!member) {
                return (
                  <span
                    key={index}
                    aria-hidden="true"
                    className="block size-10 rounded-md border border-dashed"
                  />
                );
              }
              return (
                <span key={index} className="relative block">
                  <PokemonSprite species={member.species} size={40} />
                  {member.item ? (
                    <ItemIcon
                      item={member.item}
                      className="absolute right-0 bottom-0 size-4 rounded-md bg-background"
                    />
                  ) : null}
                </span>
              );
            })}
          </span>
        </button>
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
  // The team whose preview panel is open, if any.
  const [previewTeamId, setPreviewTeamId] = useState<string | null>(null);

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
      gameTeamId: imported.gameTeamId ?? undefined,
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
  const previewTeam =
    previewTeamId === null
      ? null
      : (teams.find((team) => team.id === previewTeamId) ?? null);

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
        <LoadingArea
          pending={true}
          label={t("teams.loading")}
          skeleton={<TeamGridSkeleton />}
        />
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
        // Recording mode fills the empty list with sample teams instead of
        // an empty state; they are marked as examples and never clickable.
        isDemoMode() ? (
          <DemoTeamGrid />
        ) : (
          <EmptyState
            title={t("teams.empty")}
            description={t("teams.emptyDescription")}
          />
        )
      ) : (
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
            CONTENT_FADE_IN,
          )}
        >
          {sorted.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onRename={(name) => rename(team.id, name)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onSelect={(selected) => setPreviewTeamId(selected.id)}
            />
          ))}
        </div>
      )}
      {previewTeam ? (
        <TeamPreviewPanel
          team={previewTeam}
          open={true}
          onOpenChange={(open) => {
            if (!open) setPreviewTeamId(null);
          }}
        />
      ) : null}
    </Page>
  );
}
