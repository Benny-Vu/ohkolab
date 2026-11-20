import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { ChevronDownIcon, MinusIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AbilityPicker } from "@/components/pokemon-editor/ability-picker";
import { ItemPicker } from "@/components/pokemon-editor/item-picker";
import { MovePicker } from "@/components/pokemon-editor/move-picker";
import { SpeciesPicker } from "@/components/pokemon-editor/species-picker";
import { PokemonIcon } from "@/components/pokemon-sprite";
import {
  buttonSmTouchClass,
  iconHitSmClass,
  rowHitXsClass,
  switchHitClass,
} from "@/components/touch-targets";
import { Panel, PanelTitle } from "@/features/calc/panel";
import { getSpecies, resolveBattleForme, useDisplayName } from "@/data";
import { useT } from "@/lib/i18n/t";
import { MAX_TEAM_SIZE } from "@/types/team";
import {
  addNotesMove,
  addNotesSpeedChip,
  clearNotesHistory,
  deleteNotesHistoryEntry,
  logNotesMove,
  logNotesText,
  removeNotesMove,
  removeNotesSpecies,
  removeNotesSpeedChip,
  removeNotesTurn,
  revealNotesAbility,
  revealNotesItem,
  setNotesGame,
  setNotesMega,
  setNotesPreview,
  setNotesText,
  setNotesTurn,
  startNewNotesSet,
  toggleNotesBrought,
  useBattleNotesState,
  type GameBrought,
  type SpeciesNote,
  type TurnLine,
} from "@/features/battle/notes-store";

interface NotesPanelProps {
  /**
   * The opponent's six as the battle page knows them (base species names).
   * Given, they become the cards and are remembered for the standalone page;
   * omitted, the panel works on its own from the stored preview.
   */
  opponents?: readonly string[];
  /** Offer the species picker to build the six by hand (standalone page). */
  addable?: boolean;
  /** Link to the standalone notes page (battle mode only). */
  standaloneLink?: boolean;
}

const GAMES = [1, 2, 3] as const;

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((name, index) => name === b[index]);
}

/**
 * The battle-notes panel: one card per opponent Pokémon from the
 * team-preview six — revealed item, ability and up to four moves, a Mega
 * flag, speed chips and free text — plus the best-of-3 game counter with the
 * four brought each game, an optional turn log and the archived sets.
 * Autosaves on every change; the notes stay on this device.
 */
export function NotesPanel({
  opponents,
  addable = false,
  standaloneLink = false,
}: NotesPanelProps) {
  const t = useT();
  const displayName = useDisplayName();
  const titleId = useId();
  const { current, history } = useBattleNotesState();
  const [historyOpen, setHistoryOpen] = useState(false);

  // The battle page's six become the cards and are remembered, so the
  // standalone page still shows them after a reload.
  const previewKey = opponents?.join("\n") ?? "";
  useEffect(() => {
    if (!opponents || opponents.length === 0) return;
    if (!sameList(opponents, current.preview)) setNotesPreview(opponents);
    // `previewKey` covers the list; `current.preview` is what it must match.
  }, [previewKey, opponents, current.preview]);

  const brought = current.brought.find(
    (game: GameBrought) => game.game === current.game,
  );

  const handleNewSet = () => {
    if (startNewNotesSet()) toast.success(t("battle.notesArchived"));
    setHistoryOpen(true);
  };

  return (
    <Panel labelledBy={titleId}>
      <PanelTitle id={titleId}>{t("battle.notesTitle")}</PanelTitle>
      <p className="text-sm text-muted-foreground">
        {t("battle.notesLocalOnly")}
      </p>

      <div className="grid gap-2">
        {/* The game counter: notes carry across games of the set. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{t("battle.notesGame")}</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(current.game)}
            onValueChange={(value) => {
              if (value) setNotesGame(Number(value));
            }}
          >
            {GAMES.map((game) => (
              <ToggleGroupItem
                key={game}
                value={String(game)}
                className={buttonSmTouchClass}
              >
                {game}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            type="button"
            variant="outline"
            className={`${buttonSmTouchClass} ml-auto`}
            onClick={handleNewSet}
          >
            {t("battle.notesNewSet")}
          </Button>
        </div>

        {current.preview.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t("battle.notesBrought")}
            </span>
            {current.preview.map((species) => {
              const isBrought = brought?.species.includes(species) ?? false;
              return (
                <Button
                  key={species}
                  type="button"
                  variant={isBrought ? "secondary" : "outline"}
                  size="xs"
                  className={rowHitXsClass}
                  aria-pressed={isBrought}
                  onClick={() => toggleNotesBrought(species)}
                >
                  {displayName("species", species)}
                </Button>
              );
            })}
          </div>
        ) : null}

        {addable && current.preview.length < MAX_TEAM_SIZE ? (
          <SpeciesPicker
            value={null}
            onChange={(species) =>
              setNotesPreview([...current.preview, species])
            }
            label={t("battle.notesAddSpecies")}
            placeholder={t("battle.notesAddSpecies")}
          />
        ) : null}

        {current.preview.length === 0 ? (
          <EmptyState title={t("battle.notesEmpty")} />
        ) : (
          <div className="grid gap-2">
            {current.preview.map((species) => (
              <SpeciesCard key={species} species={species} />
            ))}
          </div>
        )}

        <TurnLogSection lines={current.turns} turn={current.turn} />

        {standaloneLink ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={`${buttonSmTouchClass} justify-self-start`}
          >
            <Link to="/calc/battle/notes">
              {t("battle.notesOpenStandalone")}
            </Link>
          </Button>
        ) : null}
      </div>

      {history.length > 0 ? (
        <div className="grid gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`${buttonSmTouchClass} justify-self-start`}
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <ChevronDownIcon
              aria-hidden
              className={historyOpen ? "rotate-180" : undefined}
            />
            {historyOpen
              ? t("battle.notesHideHistory")
              : t("battle.notesShowHistory")}
          </Button>
          {historyOpen ? (
            <div className="grid gap-1.5">
              {history.map((set) => {
                const date = new Date(set.createdAt).toLocaleDateString();
                return (
                  <div
                    key={set.id}
                    className="flex min-h-11 items-center gap-2 rounded-md border px-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {t("battle.notesHistoryEntry", {
                        date,
                        count: set.preview.length,
                      })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={iconHitSmClass}
                      aria-label={t("battle.notesDeleteHistoryEntry", { date })}
                      onClick={() => deleteNotesHistoryEntry(set.id)}
                    >
                      <XIcon aria-hidden />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${buttonSmTouchClass} justify-self-start`}
                onClick={() => {
                  clearNotesHistory();
                  toast.success(t("battle.notesHistoryCleared"));
                }}
              >
                {t("battle.notesClearHistory")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

/** The turn log: a turn stepper, the free-text line and the lines so far. */
function TurnLogSection({
  lines,
  turn,
}: {
  lines: readonly TurnLine[];
  turn: number;
}) {
  const t = useT();
  const displayName = useDisplayName();
  const [lineText, setLineText] = useState("");

  const addLine = () => {
    if (lineText.trim() === "") return;
    logNotesText(lineText);
    setLineText("");
  };

  return (
    <div className="grid gap-2 rounded-md border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t("battle.notesTurnLog")}</span>
        <span className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className={iconHitSmClass}
            aria-label={t("battle.notesTurnDown")}
            onClick={() => setNotesTurn(turn - 1)}
          >
            <MinusIcon aria-hidden />
          </Button>
          <span
            className="w-10 text-center font-mono text-sm tabular-nums"
            aria-label={t("battle.notesTurnValue", { n: turn })}
          >
            T{turn}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className={iconHitSmClass}
            aria-label={t("battle.notesTurnUp")}
            onClick={() => setNotesTurn(turn + 1)}
          >
            <PlusIcon aria-hidden />
          </Button>
        </span>
      </div>

      {lines.length > 0 ? (
        <ol className="grid gap-1">
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex min-h-11 items-center gap-2 rounded-md bg-muted/40 px-2"
            >
              <span className="min-w-0 flex-1 break-words text-sm">
                {line.move && line.species
                  ? t("battle.notesTurnLine", {
                      turn: line.turn,
                      move: displayName("move", line.move),
                      species: displayName("species", line.species),
                    })
                  : line.text}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={iconHitSmClass}
                aria-label={t("battle.notesRemoveLine")}
                onClick={() => removeNotesTurn(line.id)}
              >
                <XIcon aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="flex items-center gap-1.5">
        <Input
          value={lineText}
          onChange={(event) => setLineText(event.target.value)}
          placeholder={t("battle.notesLinePlaceholder")}
          aria-label={t("battle.notesLinePlaceholder")}
          className="min-w-0 flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter") addLine();
          }}
        />
        <Button
          type="button"
          variant="outline"
          className={buttonSmTouchClass}
          onClick={addLine}
        >
          {t("battle.notesAddLine")}
        </Button>
      </div>
    </div>
  );
}

/**
 * One opponent Pokémon's card: the revealed fields behind a compact header
 * (the summary badges), so the list of six stays scannable mid-match.
 */
function SpeciesCard({ species }: { species: string }) {
  const t = useT();
  const displayName = useDisplayName();
  const { current } = useBattleNotesState();
  const [open, setOpen] = useState(false);
  const note = current.notes[species];
  const name = displayName("species", species);

  const summary: string[] = [];
  if (note?.item) summary.push(displayName("item", note.item));
  if (note?.ability) summary.push(displayName("ability", note.ability));
  for (const move of note?.moves ?? []) {
    summary.push(displayName("move", move));
  }
  if (note && note.note !== "") summary.push(t("battle.notesHasNote"));

  return (
    <div className="grid gap-2 rounded-md border p-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className={`${buttonSmTouchClass} h-auto flex-1 justify-start px-1 py-2`}
          aria-expanded={open}
          aria-label={t("battle.notesCard", { name })}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden className="flex size-8 shrink-0">
            <PokemonIcon species={species} className="size-8" />
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5 text-left">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium">{name}</span>
              {note?.mega ? (
                <Badge variant="outline" className="px-1 text-2xs">
                  {t("battle.notesMega")}
                </Badge>
              ) : null}
            </span>
            {summary.length > 0 ? (
              <span className="truncate text-xs text-muted-foreground">
                {summary.join(" · ")}
              </span>
            ) : (
              <span className="truncate text-xs text-muted-foreground">
                {t("battle.notesNothingRevealed")}
              </span>
            )}
          </span>
          <ChevronDownIcon
            aria-hidden
            className={open ? "rotate-180" : undefined}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={iconHitSmClass}
          aria-label={t("battle.notesRemoveCard", { name })}
          onClick={() => removeNotesSpecies(species)}
        >
          <XIcon aria-hidden />
        </Button>
      </div>

      {open ? <CardBody species={species} note={note} /> : null}
    </div>
  );
}

/** The pickers and chips of one card. */
function CardBody({
  species,
  note,
}: {
  species: string;
  note: SpeciesNote | undefined;
}) {
  const t = useT();
  const displayName = useDisplayName();
  const moves = note?.moves ?? [];
  const megas = getSpecies(species)?.megas ?? [];

  // With a Mega revealed, the ability list is the forme's.
  const forme =
    note?.item && megas.some((mega) => mega.stone === note.item)
      ? resolveBattleForme(species, note.item)
      : note?.mega
        ? (megas[0]?.forme ?? species)
        : species;

  const scarfChip = note?.speed.find((chip) => chip.kind === "scarf");

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <ItemPicker
            value={note?.item ?? null}
            onChange={(item) => revealNotesItem(species, item)}
            species={species}
            label={t("pokemonEditor.item")}
            placeholder={t("battle.notesUnrevealed")}
          />
          <AbilityPicker
            value={note?.ability ?? null}
            onChange={(ability) => revealNotesAbility(species, ability)}
            species={forme}
            placeholder={t("battle.notesUnrevealed")}
          />
        </div>
        <div className="grid content-start gap-1.5">
          {megas.length > 0 ? (
            <div className="flex items-center gap-2">
              <Switch
                id={`notes-mega-${species}`}
                className={switchHitClass}
                checked={note?.mega ?? false}
                onCheckedChange={(on) => setNotesMega(species, on)}
              />
              <Label htmlFor={`notes-mega-${species}`} className="text-sm">
                {t("battle.notesMega")}
              </Label>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            {moves.map((move) => (
              <div key={move} className="flex items-center gap-1">
                <MovePicker
                  value={move}
                  species={forme}
                  exclude={moves}
                  onChange={(next) => {
                    if (next === null) removeNotesMove(species, move);
                    else {
                      removeNotesMove(species, move);
                      addNotesMove(species, next);
                    }
                  }}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={iconHitSmClass}
                  aria-label={t("battle.notesLogMove", {
                    move: displayName("move", move),
                    species: displayName("species", species),
                  })}
                  onClick={() => logNotesMove(species, move)}
                >
                  <PlusIcon aria-hidden />
                </Button>
              </div>
            ))}
            {moves.length < 4 ? (
              <MovePicker
                value={null}
                species={forme}
                exclude={moves}
                clearable={false}
                onChange={(move) => {
                  if (move) addNotesMove(species, move);
                }}
                label={t("battle.notesAddMove")}
                placeholder={t("battle.notesAddMove")}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t("battle.notesSpeed")}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={scarfChip ? "secondary" : "outline"}
            size="xs"
            className={rowHitXsClass}
            aria-pressed={Boolean(scarfChip)}
            onClick={() => {
              const chip = { kind: "scarf" as const, other: null };
              if (scarfChip) removeNotesSpeedChip(species, chip);
              else addNotesSpeedChip(species, chip);
            }}
          >
            {t("battle.notesScarfChip")}
          </Button>
          <SpeciesPicker
            value={null}
            onChange={(other) => {
              if (other !== species) {
                addNotesSpeedChip(species, { kind: "faster", other });
              }
            }}
            label={t("battle.notesFasterPick")}
            placeholder={t("battle.notesFasterPick")}
          />
          <SpeciesPicker
            value={null}
            onChange={(other) => {
              if (other !== species) {
                addNotesSpeedChip(species, { kind: "slower", other });
              }
            }}
            label={t("battle.notesSlowerPick")}
            placeholder={t("battle.notesSlowerPick")}
          />
        </div>
        {(note?.speed.length ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {note?.speed.map((chip) => (
              <Button
                key={`${chip.kind}-${chip.other ?? ""}`}
                type="button"
                variant="secondary"
                size="xs"
                className={rowHitXsClass}
                aria-label={t("battle.notesRemoveChip")}
                onClick={() => removeNotesSpeedChip(species, chip)}
              >
                {chip.kind === "scarf"
                  ? t("battle.notesScarfChip")
                  : chip.kind === "faster"
                    ? t("battle.notesFasterChip", {
                        name:
                          chip.other !== null
                            ? displayName("species", chip.other)
                            : "",
                      })
                    : t("battle.notesSlowerChip", {
                        name:
                          chip.other !== null
                            ? displayName("species", chip.other)
                            : "",
                      })}
                <XIcon aria-hidden />
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`notes-text-${species}`} className="text-sm">
          {t("battle.notesNote")}
        </Label>
        <Textarea
          id={`notes-text-${species}`}
          rows={2}
          value={note?.note ?? ""}
          onChange={(event) => setNotesText(species, event.target.value)}
          placeholder={t("battle.notesNotePlaceholder")}
        />
      </div>
    </div>
  );
}
