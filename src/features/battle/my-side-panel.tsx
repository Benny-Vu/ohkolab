import { useId, useState, type Dispatch, type SetStateAction } from "react";
import { ClipboardPasteIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Picker, type PickerOption } from "@/components/picker";
import { TeamPreview } from "@/components/team-preview/team-preview";
import { Button } from "@/components/ui/button";
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
import { Panel, PanelTitle } from "@/features/calc/panel";
import { importTeam } from "@/lib/team";
import { displayTeamName } from "@/lib/team/display";
import { useTeams } from "@/lib/team/use-teams";
import { formatRelativeTime } from "@/lib/relative-time";
import { useT } from "@/lib/i18n/t";
import type { PokemonSet } from "@/types/pokemon";
import { MAX_TEAM_SIZE } from "@/types/team";
import {
  buttonSmTouchClass,
  buttonTouchClass,
} from "@/components/touch-targets";

interface MySidePanelProps {
  sets: PokemonSet[];
  onSetsChange: Dispatch<SetStateAction<PokemonSet[]>>;
}

const PASTE_PLACEHOLDER =
  "Garchomp @ Life Orb\nAbility: Rough Skin\nJolly Nature\nEVs: 32 Atk / 32 Spe\n- Earthquake\n\nIncineroar @ Assault Vest\n...";

/**
 * Your side of battle mode: one of your saved teams, or a Showdown paste of
 * your own six. Reads the same team store the team pages read, so a team
 * saved there is pickable here — and with no saved teams (a signed-out
 * visitor, a fresh browser) the paste still works on its own.
 */
export function MySidePanel({ sets, onSetsChange }: MySidePanelProps) {
  const t = useT();
  const { teams } = useTeams();
  const titleId = useId();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const teamOptions: PickerOption[] = teams.map((team) => ({
    value: team.id,
    label: displayTeamName(team.name),
    description: t("teams.cardMeta", {
      format:
        team.format === "doubles"
          ? t("calc.formatDoubles")
          : t("calc.formatSingles"),
      count: team.members.length,
      date: formatRelativeTime(team.updatedAt),
    }),
  }));

  const handlePickTeam = (id: string) => {
    const team = teams.find((entry) => entry.id === id);
    if (team) onSetsChange(team.members);
  };

  const handleUsePaste = () => {
    const imported = importTeam(pasteText);
    if (imported.sets.length === 0) {
      toast.error(t("teams.importEmptyError"));
      return;
    }
    onSetsChange(imported.sets);
    for (const warning of imported.warnings) toast.warning(warning);
    toast.success(t("teams.imported", { count: imported.sets.length }));
    setPasteOpen(false);
    setPasteText("");
  };

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>{t("battle.mySide")}</PanelTitle>

      <div className="grid gap-2 sm:grid-cols-2">
        <Picker
          options={teamOptions}
          value=""
          onValueChange={handlePickTeam}
          placeholder={
            teams.length > 0 ? t("battle.chooseTeam") : t("battle.noTeams")
          }
          searchPlaceholder={t("battle.chooseTeam")}
          emptyMessage={t("battle.noTeams")}
          aria-label={t("battle.savedTeam")}
        />
        <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className={buttonSmTouchClass}>
              <ClipboardPasteIcon aria-hidden />
              {t("battle.pasteTeam")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("battle.pasteMyTeamTitle")}</DialogTitle>
              <DialogDescription>
                {t("battle.pasteMyTeamDescription")}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              aria-label={t("battle.pasteMyTeamTitle")}
              className="font-mono text-xs"
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              rows={10}
              placeholder={PASTE_PLACEHOLDER}
            />
            <DialogFooter>
              <Button
                variant="outline"
                className={buttonTouchClass}
                onClick={() => setPasteOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button className={buttonTouchClass} onClick={handleUsePaste}>
                {t("battle.usePaste")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sets.length > 0 ? (
        <TeamPreview team={{ members: sets.slice(0, MAX_TEAM_SIZE) }} />
      ) : (
        <EmptyState
          title={t("battle.emptyMySide")}
          description={t("battle.pasteMyTeamDescription")}
        />
      )}
    </Panel>
  );
}
