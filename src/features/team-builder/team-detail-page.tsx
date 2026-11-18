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
import { calcStats, createDefaultSet, validateSet } from "@/data";
import { SpeedTiers } from "@/features/team-builder/speed-tiers";
import { TypeHeatMap } from "@/features/team-builder/type-heat-map";
import { useAuth } from "@/lib/auth/use-auth";
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
import { STAT_IDS, STAT_LABELS } from "@/types/pokemon";
import type { PokemonSet } from "@/types/pokemon";
import { MAX_TEAM_SIZE } from "@/types/team";

const WARNING_TITLES: Record<TeamWarning["kind"], string> = {
  "duplicate-species": "Duplicate species",
  "duplicate-item": "Duplicate item",
  set: "Set problems",
};

export function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
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
        <Page title="Teams" description="Loading your teams…">
          <p className="text-muted-foreground">Loading your teams…</p>
        </Page>
      );
    }
    if (sync.error) {
      return (
        <Page title="Teams" description="Your teams could not be loaded.">
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
        </Page>
      );
    }
    return (
      <Page
        title="Team not found"
        description="This team may have been deleted."
      >
        <Button asChild variant="outline">
          <Link to="/teams">Back to teams</Link>
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
      setNameError("Name cannot be empty.");
      return;
    }
    if (trimmed !== team.name) rename(team.id, trimmed);
    setRenameOpen(false);
  };

  const handleDuplicate = () => {
    const copy = duplicate(team.id);
    if (copy) {
      toast.success(`Duplicated as "${copy.name}".`);
      navigate(`/teams/${copy.id}`);
    }
  };

  const handleDelete = () => {
    remove(team.id);
    navigate("/teams");
    toast(`Deleted "${team.name}".`, {
      action: {
        label: "Undo",
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
      toast.success("Copied to clipboard.");
    });
  };

  return (
    <Page
      title={team.name}
      description={`${team.members.length} of ${MAX_TEAM_SIZE} Pokémon`}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link to="/teams">
              <ArrowLeftIcon />
              Teams
            </Link>
          </Button>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={team.format}
            onValueChange={(value) => {
              if (value) setFormat(team.id, value as BattleFormat);
            }}
          >
            <ToggleGroupItem value="singles">Singles</ToggleGroupItem>
            <ToggleGroupItem value="doubles">Doubles</ToggleGroupItem>
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
                aria-label="Public team"
              />
              <Label htmlFor="team-public">Public</Label>
            </div>
          )}
          {inlineEditing ? (
            <Input
              aria-label="Team name"
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
                  aria-label="Rename team"
                  onClick={() => {
                    setInlineDraft(team.name);
                    setInlineEditing(true);
                  }}
                >
                  <PencilIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rename</TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => setExportOpen(true)}
          >
            <DownloadIcon />
            Export
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Export team"
                className="md:hidden"
                onClick={() => setExportOpen(true)}
              >
                <DownloadIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            onClick={handleDuplicate}
          >
            <CopyIcon />
            Duplicate
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Duplicate team"
                className="md:hidden"
                onClick={handleDuplicate}
              >
                <CopyIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openRename()}>
                <PencilIcon aria-hidden />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => handleDelete()}
              >
                <Trash2Icon aria-hidden />
                Delete team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename team</DialogTitle>
                <DialogDescription>
                  Choose a new name for this team.
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
                  aria-label="Team name"
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
                  Cancel
                </Button>
                <Button type="submit" form="rename-team-form">
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export team</DialogTitle>
                <DialogDescription>
                  Copy this Showdown export to share the team.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                aria-label="Showdown export"
                readOnly
                rows={10}
                value={exportText}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setExportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={copyExport}>
                  <ClipboardCopyIcon />
                  Copy
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
                  aria-label="Add Pokémon"
                  className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <PlusIcon className="size-5" />
                  Add Pokémon
                </button>
              );
            }
            const label = memberLabel(member);
            const types = battleTypes(member) ?? [];
            const finalStats = calcStats(member);
            const meta = [member.item, member.ability]
              .filter(Boolean)
              .join(" · ");
            const moves = member.moves.filter(Boolean).join(" · ");
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
                            {STAT_LABELS[stat]}
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
                    aria-label={`Move ${label} up`}
                    disabled={index === 0}
                    onClick={() => moveMember(team.id, index, index - 1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Move ${label} down`}
                    disabled={index === team.members.length - 1}
                    onClick={() => moveMember(team.id, index, index + 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Edit ${label}`}
                    onClick={() => openEdit(index)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      navigate("/calc", { state: { attacker: member } })
                    }
                  >
                    Calc
                  </Button>
                  <span className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${label}`}
                    onClick={() => removeMember(team.id, index)}
                  >
                    <Trash2Icon />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {team.members.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Team analysis</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {warnings.length > 0 && (
                <div className="flex flex-col gap-2">
                  {warnings.map((warning, index) => (
                    <Alert key={index} variant="destructive">
                      <TriangleAlertIcon />
                      <AlertTitle>{WARNING_TITLES[warning.kind]}</AlertTitle>
                      <AlertDescription>{warning.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
              {weakSpots.length > 0 && (
                <div className="flex flex-col gap-1">
                  {weakSpots.map((spot) => (
                    <p key={spot} className="text-sm">
                      {spot}
                    </p>
                  ))}
                </div>
              )}
              <Tabs defaultValue="defense">
                <TabsList>
                  <TabsTrigger value="defense">Defense</TabsTrigger>
                  <TabsTrigger value="offense">Offense</TabsTrigger>
                </TabsList>
                <TabsContent value="defense">
                  <TypeHeatMap members={team.members} mode="defense" />
                </TabsContent>
                <TabsContent value="offense">
                  <TypeHeatMap members={team.members} mode="offense" />
                </TabsContent>
              </Tabs>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Speed tiers</h3>
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
              {editorIndex === null ? "Add Pokémon" : "Edit Pokémon"}
            </SheetTitle>
            <SheetDescription>
              Pick a species, item, moves and stat points.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {draft && <PokemonEditor value={draft} onChange={setDraft} />}
          </div>
          <SheetFooter className="flex-row! items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveDraft}
              disabled={!draft || validateSet(draft).length > 0}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Page>
  );
}
