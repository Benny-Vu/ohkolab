import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
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
import { PokemonEditor } from "@/components/pokemon-editor";
import { ItemIcon, PokemonSprite } from "@/components/pokemon-sprite";
import { StatBar } from "@/components/stat-bar";
import { TypeBadge } from "@/components/type-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calcStats,
  createDefaultSet,
  useDisplayName,
  validateSet,
} from "@/data";
import { SpeedTiers } from "@/features/team-builder/speed-tiers";
import { TypeHeatMap } from "@/features/team-builder/type-heat-map";
import { statLabel } from "@/components/stat-labels";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { track } from "@/lib/telemetry/analytics";
import {
  battleTypes,
  defensiveWeakSpots,
  exportTeam,
  memberLabel,
  teamWarnings,
  useTeams,
} from "@/lib/team";
import type { TeamWarning } from "@/lib/team";
import type { BattleFormat } from "@/types/battle";
import { STAT_IDS } from "@/types/pokemon";
import type { PokemonSet } from "@/types/pokemon";
import { MAX_TEAM_SIZE } from "@/types/team";

const WARNING_TITLE_KEYS: Record<TeamWarning["kind"], TranslationKey> = {
  "duplicate-species": "teams.warningDuplicateSpecies",
  "duplicate-item": "teams.warningDuplicateItem",
  set: "teams.warningSet",
};

/**
 * A member card unmounts when it is removed, taking focus with it; park focus
 * on the page landmark so keyboard users keep their place.
 */
function focusMainLandmark(): void {
  (document.querySelector("main") as HTMLElement | null)?.focus();
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

  if (!team) {
    if (sync.loading) {
      return (
        <Page title={t("teams.title")} description={t("teams.loading")}>
          <p className="text-muted-foreground">{t("teams.loading")}</p>
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
    return (
      <Page
        title={t("teams.notFound")}
        description={t("teams.notFoundDescription")}
      >
        <Button asChild variant="outline">
          <Link to="/teams">{t("teams.backToTeams")}</Link>
        </Button>
      </Page>
    );
  }

  const warnings = teamWarnings(team.members);
  const weakSpots = defensiveWeakSpots(team.members);
  const exportText = exportTeam(team.members);

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
    toast(t("teams.deleted", { name: team.name }), {
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
      title={team.name}
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
            const types = battleTypes(member) ?? [];
            const finalStats = calcStats(member);
            const meta = [
              member.item ? displayName("item", member.item) : null,
              member.ability ? displayName("ability", member.ability) : null,
            ]
              .filter(Boolean)
              .join(" · ");
            const moves = member.moves
              .filter((move): move is string => Boolean(move))
              .map((move) => displayName("move", move))
              .join(" · ");
            return (
              <Card key={index} size="sm">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <PokemonSprite species={member.species} size={64} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{label}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {types.map((type) => (
                          <TypeBadge key={type} type={type} />
                        ))}
                      </div>
                      {meta ? (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                          {member.item ? (
                            <ItemIcon
                              item={member.item}
                              className="size-3.5 shrink-0"
                            />
                          ) : null}
                          <span className="truncate">{meta}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {moves ? (
                    <p className="text-xs text-muted-foreground">{moves}</p>
                  ) : null}
                  <div className="grid grid-cols-6 gap-1.5">
                    {STAT_IDS.map((stat) => (
                      <div key={stat} className="flex flex-col gap-1">
                        <span className="flex items-baseline justify-between gap-1">
                          <span className="text-[9px] text-muted-foreground">
                            {statLabel(t, stat)}
                          </span>
                          <span className="font-mono text-[10px] tabular-nums">
                            {finalStats[stat]}
                          </span>
                        </span>
                        <StatBar
                          value={finalStats[stat]}
                          max={200}
                          className="h-1!"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex-wrap gap-1">
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
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {team.members.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("teams.analysis")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {warnings.length > 0 && (
                <div className="flex flex-col gap-2">
                  {warnings.map((warning, index) => (
                    <Alert key={index} variant="destructive">
                      <TriangleAlertIcon aria-hidden />
                      <AlertTitle>
                        {t(WARNING_TITLE_KEYS[warning.kind])}
                      </AlertTitle>
                      <AlertDescription>
                        {t(warning.message.key, warning.message.params)}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
              {weakSpots.length > 0 && (
                <div className="flex flex-col gap-1">
                  {weakSpots.map((spot) => (
                    <p key={spot.type} className="text-sm">
                      {spot.noResist
                        ? t("teams.weakSpotNoResist", {
                            count: spot.weak,
                            type: displayName("type", spot.type),
                          })
                        : t("teams.weakSpot", {
                            count: spot.weak,
                            type: displayName("type", spot.type),
                          })}
                    </p>
                  ))}
                </div>
              )}
              <Tabs defaultValue="defense">
                <TabsList>
                  <TabsTrigger value="defense">
                    {t("teams.defense")}
                  </TabsTrigger>
                  <TabsTrigger value="offense">
                    {t("teams.offense")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="defense">
                  <TypeHeatMap members={team.members} mode="defense" />
                </TabsContent>
                <TabsContent value="offense">
                  <TypeHeatMap members={team.members} mode="offense" />
                </TabsContent>
              </Tabs>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">{t("teams.speedTiers")}</h3>
                <SpeedTiers members={team.members} />
              </div>
            </CardContent>
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
