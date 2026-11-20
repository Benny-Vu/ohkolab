import {
  useCallback,
  useEffect,
  useId,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ClipboardPasteIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
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
import { SpeciesPicker } from "@/components/pokemon-editor/species-picker";
import { PokemonIcon } from "@/components/pokemon-sprite";
import {
  buttonSmTouchClass,
  buttonTouchClass,
  rowHitXsClass,
} from "@/components/touch-targets";
import { Panel, PanelTitle } from "@/features/calc/panel";
import { useCommonSets } from "@/features/metagame/use-common-sets";
import { useDisplayName } from "@/data/display-names";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import type { BattleFormat } from "@/types/battle";
import { MAX_TEAM_SIZE } from "@/types/team";
import {
  assumedInput,
  commonSetToInput,
  opponentsFromText,
  type OpponentInput,
  type SetProvenance,
} from "@/features/battle/opponent-input";
import { useRecentSpecies } from "@/features/battle/recent-species";

const PROVENANCE_KEYS: Record<SetProvenance, TranslationKey> = {
  common: "battle.provenanceCommon",
  assumed: "battle.provenanceAssumed",
  custom: "battle.provenanceCustom",
  revealed: "battle.provenanceRevealed",
};

const PASTE_PLACEHOLDER =
  "Incineroar\nWhimsicott\nGarchomp\n\n…or a Showdown export:\n\nGarchomp @ Choice Scarf\nAbility: Rough Skin\nJolly Nature\n- Earthquake";

interface OpponentPanelProps {
  opponents: OpponentInput[];
  onOpponentsChange: Dispatch<SetStateAction<OpponentInput[]>>;
  format: BattleFormat;
  /** Species with revealed battle notes: their badge becomes "revealed". */
  revealedSpecies?: ReadonlySet<string>;
}

/**
 * The opponent's side of battle mode: six slots picked by type-ahead (the
 * calc's own searchable picker), filled in with each species' most common
 * usage set as soon as the snapshot has it. Every slot carries its
 * provenance ("common set", "assumed", "custom") as data in
 * `OpponentInput` — the seam the battle-notes stream will extend.
 */
export function OpponentPanel({
  opponents,
  onOpponentsChange,
  format,
  revealedSpecies,
}: OpponentPanelProps) {
  const t = useT();
  const displayName = useDisplayName();
  const titleId = useId();
  const { recent, remember } = useRecentSpecies();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const fillCommonSet = useCallback(
    (slot: number, input: OpponentInput) => {
      onOpponentsChange(
        // Fill only the slot this set belongs to, and never over a set the
        // user provided themselves.
        (opponents) =>
          opponents.map((current, index) =>
            index === slot &&
            current.provenance !== "custom" &&
            current.species === input.species
              ? input
              : current,
          ),
      );
    },
    [onOpponentsChange],
  );

  const addSpecies = (species: string) => {
    remember(species);
    onOpponentsChange([...opponents, assumedInput(species)]);
  };

  const removeSlot = (slot: number) => {
    onOpponentsChange(opponents.filter((_, index) => index !== slot));
  };

  const handleReadPaste = () => {
    const { inputs, warnings } = opponentsFromText(pasteText);
    if (inputs.length === 0) {
      toast.error(t("teams.importEmptyError"));
      return;
    }
    for (const input of inputs) remember(input.species);
    onOpponentsChange(inputs);
    if (warnings.length > 0) {
      toast.success(
        t("teams.importedWithWarnings", {
          count: inputs.length,
          warningCount: warnings.length,
        }),
      );
      for (const warning of warnings) toast.warning(warning);
    } else {
      toast.success(t("teams.imported", { count: inputs.length }));
    }
    setPasteOpen(false);
    setPasteText("");
  };

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>{t("battle.opponents")}</PanelTitle>

      <div className="grid gap-2">
        {opponents.map((opponent, slot) => (
          <div key={slot} className="flex items-center gap-2">
            <span aria-hidden className="flex size-8 shrink-0">
              <PokemonIcon species={opponent.species} className="size-8" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {displayName("species", opponent.species)}
              </span>
              <Badge
                variant="secondary"
                className="mt-0.5 max-sm:scale-90 max-sm:origin-left"
              >
                {t(
                  revealedSpecies?.has(opponent.species)
                    ? PROVENANCE_KEYS.revealed
                    : PROVENANCE_KEYS[opponent.provenance],
                )}
              </Badge>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={rowHitXsClass}
              aria-label={t("battle.removeOpponent", {
                name: displayName("species", opponent.species),
              })}
              onClick={() => removeSlot(slot)}
            >
              <XIcon aria-hidden />
            </Button>
            {/* Auto-fills this slot with the species' most common set once
                the usage snapshot has it; never over a custom set. */}
            <CommonSetFiller
              slot={slot}
              species={opponent.species}
              provenance={opponent.provenance}
              format={format}
              onFill={fillCommonSet}
            />
          </div>
        ))}

        {opponents.length === 0 ? (
          <EmptyState title={t("battle.emptyOpponents")} />
        ) : null}

        {opponents.length < MAX_TEAM_SIZE ? (
          <SpeciesPicker
            value={null}
            onChange={addSpecies}
            label={t("battle.opponentSpecies")}
            placeholder={t("battle.addOpponent")}
          />
        ) : null}

        {recent.length > 0 && opponents.length < MAX_TEAM_SIZE ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t("battle.recentPicks")}
            </span>
            {recent.map((species) => (
              <Button
                key={species}
                type="button"
                variant="outline"
                size="xs"
                className={rowHitXsClass}
                onClick={() => addSpecies(species)}
              >
                {displayName("species", species)}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className={buttonSmTouchClass}>
            <ClipboardPasteIcon aria-hidden />
            {t("battle.pastePreview")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("battle.pastePreviewTitle")}</DialogTitle>
            <DialogDescription>
              {t("battle.pastePreviewDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label={t("battle.pastePreviewTitle")}
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
            <Button className={buttonTouchClass} onClick={handleReadPaste}>
              {t("battle.readTeam")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/**
 * Watches one opponent slot against the usage snapshot: as soon as the
 * species' most common set arrives, it fills the slot through `onFill`.
 * Renders nothing — the slot row is the UI, this is just the data flow.
 */
function CommonSetFiller({
  slot,
  species,
  provenance,
  format,
  onFill,
}: {
  slot: number;
  species: string;
  provenance: SetProvenance;
  format: BattleFormat;
  onFill: (slot: number, input: OpponentInput) => void;
}) {
  const { sets, isPending } = useCommonSets(species, format, 1);

  useEffect(() => {
    if (isPending || provenance === "custom") return;
    const top = sets[0];
    if (!top) return;
    onFill(slot, commonSetToInput(species, top));
  }, [isPending, sets, slot, species, provenance, onFill]);

  return null;
}
