import { lazy, Suspense, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ClipboardCopyIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { displayTeamName } from "@/lib/team/display";
import { PokemonEditor } from "@/components/pokemon-editor";
import { LoadingArea, TeamDetailSkeleton } from "@/components/skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createDefaultSet, useDisplayName, validateSet } from "@/data";
import { MemberCard } from "@/features/team-builder/member-card";
import { PublicTeamView } from "@/features/team-builder/public-team-view";
import { ShareButton } from "@/features/share/share-button";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";
import { track } from "@/lib/telemetry/analytics";
import {
  exportTeam,
  memberLabel,
  sanitizeGameTeamId,
  useTeams,
} from "@/lib/team";
import type { BattleFormat } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";
import { MAX_TEAM_SIZE, type Team } from "@/types/team";

// The analysis tables are heavy and off by default: the section lives in
// its own module and loads lazily, keeping the team routes chunk light.
const AnalysisSection = lazy(() =>
  import("@/features/team-builder/analysis-section").then((m) => ({
    default: m.AnalysisSection,
  })),
);

/**
 * A member card unmounts when it is removed, taking focus with it; park focus
 * on the page landmark so keyboard users keep their place.
 */
function focusMainLandmark(): void {
  (document.querySelector("main") as HTMLElement | null)?.focus();
}

/**
 * The optional Champions team ID field. Remounts per team (keyed by id), so
 * the draft starts from the stored ID and commits on blur or Enter. An empty
 * input clears the ID; a malformed one shows the rule instead of saving.
 */
function GameTeamIdField({
  team,
  onSet,
}: {
  team: Team;
  onSet: (id: string, gameTeamId: string) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState(team.gameTeamId ?? "");
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const trimmed = draft.trim();
    const id = sanitizeGameTeamId(trimmed);
    if (trimmed !== "" && !id) {
      setError(t("teams.gameIdInvalid"));
      return;
    }
    setError(null);
    if (id !== (team.gameTeamId ?? "")) onSet(team.id, id);
  };

  return (
    <div className="grid max-w-sm gap-1.5">
      <Label htmlFor="team-game-id">{t("teams.gameIdFieldLabel")}</Label>
      <Input
        id="team-game-id"
        aria-invalid={error ? true : undefined}
        aria-describedby="team-game-id-hint"
        value={draft}
        placeholder="AbCd123456"
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
      <p id="team-game-id-hint" className="text-xs text-muted-foreground">
        {error ?? t("teams.gameIdHint")}
      </p>
    </div>
  );
}

export function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const displayName = useDisplayName();
  const {
    teams,
    rename,
    setFormat,
    duplicate,
    remove,
    addMember,
    updateMember,
    removeMember,
    moveMember,
    restore,
    setPublic,
    setGameTeamId,
    sync,
  } = useTeams();
  const { user } = useAuth();
  const team = teams.find((candidate) => candidate.id === teamId);

  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [inlineDraft, setInlineDraft] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<PokemonSet | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  // The analysis card starts collapsed on every visit; no persistence.
  const [analysisOpen, setAnalysisOpen] = useState(false);
  // Once opened, the (lazily loaded) section stays mounted so closing can
  // animate the height down instead of snapping out of existence.
  const [analysisLoaded, setAnalysisLoaded] = useState(false);

  if (!team) {
    if (sync.loading) {
      return (
        <Page title={t("teams.title")} description={t("teams.loading")}>
          <LoadingArea
            pending={true}
            label={t("teams.loading")}
            skeleton={<TeamDetailSkeleton />}
          />
        </Page>
      );
    }
    if (sync.error) {
      return (
        <Page
          title={t("teams.title")}
          description={t("teams.loadErrorDescription")}
        >
          <div className="grid gap-4">
            <Alert>
              <TriangleAlertIcon aria-hidden />
              <AlertTitle>{t("teams.loadError")}</AlertTitle>
              <AlertDescription>{sync.error}</AlertDescription>
            </Alert>
            <Button className="justify-self-start" onClick={() => sync.retry()}>
              {t("teams.retry")}
            </Button>
          </div>
        </Page>
      );
    }
    // Not one of the visitor's teams: it may still be a public team another
    // player shared, so try that before giving up.
    return <PublicTeamView teamId={teamId ?? ""} />;
  }

  const exportText = exportTeam(team.members, team.gameTeamId);

  const openAdd = () => {
    setEditorIndex(null);
    setDraft(createDefaultSet(""));
    setEditorOpen(true);
  };

  const openEdit = (index: number) => {
    const member = team.members[index];
    if (!member) return;
    setEditorIndex(index);
    setDraft(member);
    setEditorOpen(true);
  };

  const saveDraft = () => {
    if (!draft || validateSet(draft).length > 0) return;
    if (editorIndex === null) {
      addMember(team.id, draft);
    } else {
      updateMember(team.id, editorIndex, draft);
    }
    setEditorOpen(false);
    setDraft(null);
  };

  const openRename = () => {
    setInlineEditing(false);
    setNameDraft(team.name);
    setNameError(null);
    setRenameOpen(true);
  };

  const commitInlineRename = () => {
    setInlineEditing(false);
    const trimmed = inlineDraft.trim();
    if (trimmed && trimmed !== team.name) rename(team.id, trimmed);
  };

  const commitRename = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError(t("teams.nameEmpty"));
      return;
    }
    if (trimmed !== team.name) rename(team.id, trimmed);
    setRenameOpen(false);
  };

  const handleDuplicate = () => {
    const copy = duplicate(team.id);
    if (copy) {
      toast.success(t("teams.duplicated", { name: copy.name }));
      navigate(`/teams/${copy.id}`);
    }
  };

  const handleDelete = () => {
    remove(team.id);
    navigate("/teams");
    toast(t("teams.deleted", { name: displayTeamName(team.name) }), {
      action: {
        label: t("teams.undo"),
        onClick: () => restore(team),
      },
    });
  };

  const copyExport = () => {
    void navigator.clipboard.writeText(exportText).then(() => {
      track("team_exported", {
        format: team.format,
        size: team.members.length,
      });
      toast.success(t("calc.copied"));
    });
  };

  return (
    <Page
      title={displayTeamName(team.name)}
      description={t("teams.memberCount", {
        count: team.members.length,
        max: MAX_TEAM_SIZE,
      })}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link to="/teams">
              <ArrowLeftIcon aria-hidden />
              {t("teams.title")}
            </Link>
          </Button>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={team.format}
            aria-label={t("calc.battleFormat")}
            onValueChange={(value) => {
              if (value) setFormat(team.id, value as BattleFormat);
            }}
          >
            <ToggleGroupItem value="singles">
              {t("calc.formatSingles")}
            </ToggleGroupItem>
            <ToggleGroupItem value="doubles">
              {t("calc.formatDoubles")}
            </ToggleGroupItem>
          </ToggleGroup>
          {user && (
            <div className="flex items-center gap-2">
              <Switch
                id="team-public"
                checked={team.isPublic ?? false}
                onCheckedChange={(checked) => {
                  setPublic(team.id, checked);
                  if (checked) {
                    track("team_made_public", {
                      format: team.format,
                      size: team.members.length,
                    });
                  }
                }}
                aria-label={t("teams.publicTeam")}
              />
              <Label htmlFor="team-public">{t("teams.public")}</Label>
            </div>
          )}
          {team.isPublic ? (
            <ShareButton
              title={displayTeamName(team.name)}
              text={
                team.gameTeamId
                  ? t("teams.gameIdShareText", { id: team.gameTeamId })
                  : undefined
              }
              url={`${window.location.origin}/teams/${team.id}`}
            />
          ) : null}
          {inlineEditing ? (
            <Input
              aria-label={t("teams.nameLabel")}
              autoFocus
              className="w-44!"
              value={inlineDraft}
              onChange={(event) => setInlineDraft(event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitInlineRename();
                if (event.key === "Escape") setInlineEditing(false);
              }}
              onBlur={commitInlineRename}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("teams.renameTeam")}
                  onClick={() => {
                    setInlineDraft(team.name);
                    setInlineEditing(true);
                  }}
                >
                  <PencilIcon aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("teams.rename")}</TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => setExportOpen(true)}
          >
            <DownloadIcon aria-hidden />
            {t("teams.export")}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("teams.exportTeam")}
                className="md:hidden"
                onClick={() => setExportOpen(true)}
              >
                <DownloadIcon aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("teams.export")}</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            onClick={handleDuplicate}
          >
            <CopyIcon aria-hidden />
            {t("teams.duplicate")}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("teams.duplicateTeam")}
                className="md:hidden"
                onClick={handleDuplicate}
              >
                <CopyIcon aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("teams.duplicate")}</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("teams.moreActions")}
              >
                <MoreHorizontalIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openRename()}>
                <PencilIcon aria-hidden />
                {t("teams.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => handleDelete()}
              >
                <Trash2Icon aria-hidden />
                {t("teams.deleteTeam")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("teams.renameTitle")}</DialogTitle>
                <DialogDescription>
                  {t("teams.renameDescription")}
                </DialogDescription>
              </DialogHeader>
              <form
                id="rename-team-form"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  commitRename();
                }}
                className="grid gap-2"
              >
                <Input
                  aria-label={t("teams.nameLabel")}
                  aria-invalid={nameError ? true : undefined}
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                />
                {nameError && (
                  <p className="text-sm text-destructive" role="alert">
                    {nameError}
                  </p>
                )}
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRenameOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" form="rename-team-form">
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("teams.exportTitle")}</DialogTitle>
                <DialogDescription>
                  {t("teams.exportDescription")}
                </DialogDescription>
              </DialogHeader>
              <Textarea
                aria-label={t("teams.showdownExport")}
                readOnly
                rows={10}
                value={exportText}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setExportOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={copyExport}>
                  <ClipboardCopyIcon aria-hidden />
                  {t("calc.copy")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GameTeamIdField key={team.id} team={team} onSet={setGameTeamId} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
            const member = team.members[index];
            if (!member) {
              return (
                <button
                  key={index}
                  type="button"
                  onClick={openAdd}
                  aria-label={t("teams.addPokemon")}
                  className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <PlusIcon className="size-5" aria-hidden />
                  {t("teams.addPokemon")}
                </button>
              );
            }
            const label = displayName("species", memberLabel(member));
            return (
              <MemberCard
                key={index}
                member={member}
                footer={
                  <>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("teams.moveUp", { name: label })}
                      disabled={index === 0}
                      onClick={() => moveMember(team.id, index, index - 1)}
                    >
                      <ArrowUpIcon aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("teams.moveDown", { name: label })}
                      disabled={index === team.members.length - 1}
                      onClick={() => moveMember(team.id, index, index + 1)}
                    >
                      <ArrowDownIcon aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("teams.editMember", { name: label })}
                      onClick={() => openEdit(index)}
                    >
                      <PencilIcon aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        navigate("/calc", { state: { attacker: member } })
                      }
                    >
                      {t("nav.calc")}
                    </Button>
                    <span className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("teams.removeMember", { name: label })}
                      onClick={() => {
                        removeMember(team.id, index);
                        focusMainLandmark();
                      }}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  </>
                }
              />
            );
          })}
        </div>

        {team.members.length > 0 && (
          <Card>
            <CardHeader>
              <button
                type="button"
                aria-expanded={analysisOpen}
                aria-controls="team-analysis"
                aria-label={
                  analysisOpen
                    ? t("teams.analysisCollapse")
                    : t("teams.analysisExpand")
                }
                onClick={() => {
                  const next = !analysisOpen;
                  setAnalysisOpen(next);
                  if (next) setAnalysisLoaded(true);
                }}
                className="flex w-full items-center justify-between gap-2 text-left font-heading text-base leading-snug font-medium"
              >
                {t("teams.analysis")}
                <ChevronDownIcon
                  aria-hidden
                  className={`size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-base) ease-(--motion-ease-out) ${
                    analysisOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CardHeader>
            {/* The height animates on a grid-rows 0fr→1fr transition; the
                content stays mounted after the first open so closing glides
                too. `invisible` only applies once the collapse has run
                (visibility flips at the end of a transition), and it takes
                the closed content out of the accessibility tree. */}
            <div
              id="team-analysis"
              className={cn(
                "grid transition-[grid-template-rows,visibility] duration-(--motion-slow) ease-(--motion-ease-out)",
                analysisOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] invisible",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                {analysisLoaded && (
                  <Suspense
                    fallback={
                      <CardContent>
                        <LoadingArea
                          pending={true}
                          label={t("teams.loading")}
                          skeleton={<Skeleton className="h-40 w-full" />}
                        />
                      </CardContent>
                    }
                  >
                    <AnalysisSection members={team.members} />
                  </Suspense>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setDraft(null);
        }}
      >
        <SheetContent className="w-full! sm:max-w-xl!">
          <SheetHeader>
            <SheetTitle>
              {editorIndex === null
                ? t("teams.addPokemon")
                : t("teams.editPokemon")}
            </SheetTitle>
            <SheetDescription>{t("teams.editorDescription")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {draft && <PokemonEditor value={draft} onChange={setDraft} />}
          </div>
          <SheetFooter className="flex-row! items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={saveDraft}
              disabled={!draft || validateSet(draft).length > 0}
            >
              {t("common.save")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Page>
  );
}
