import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpeciesPicker } from "@/components/pokemon-editor/species-picker";
import { rowHitXsClass } from "@/components/touch-targets";
import { useDisplayName } from "@/data";
import { useT } from "@/lib/i18n/t";
import {
  addNotesSpeedRelation,
  removeNotesSpeedRelation,
  type MyTeamMember,
  type SpeciesNote,
} from "@/features/battle/notes-store";
import {
  EMPTY_SPEED_FIELD,
  myNotedSpeed,
  rangeIsInconsistent,
  speedHint,
  speedRange,
  type SpeedFieldState,
  type SpeedRelationKind,
} from "@/features/battle/speed-note";

/**
 * The speed part of one opponent card: note "faster / slower / tie" against
 * one of my Pokémon, with the field at that moment, and read back the Speed
 * range the relations imply — plus a plain hint about the likely nature and
 * item. Without a team, my Pokémon is named by hand with an optional
 * Speed; without a Speed the relation stays a plain note.
 */
export function NotesSpeedSection({
  species,
  note,
  myTeam,
}: {
  /** The opponent Pokémon the card is for. */
  species: string;
  note: SpeciesNote | undefined;
  /** My team for this set, with Speeds; null when none was chosen. */
  myTeam: MyTeamMember[] | null;
}) {
  const t = useT();
  const displayName = useDisplayName();
  const [kind, setKind] = useState<SpeedRelationKind>("faster");
  const [mine, setMine] = useState<string | null>(null);
  const [manualSpeed, setManualSpeed] = useState("");
  const [field, setField] = useState<SpeedFieldState>({ ...EMPTY_SPEED_FIELD });

  const relations = note?.relations ?? [];
  const range = speedRange(relations);
  const hint = speedHint(species, range);
  const inconsistent = rangeIsInconsistent(range);
  const hasPriority = relations.some((relation) => relation.field.priority);

  // With a team, my Pokémon's Speed comes from its set; without one, from
  // the number typed here. Either way the relation stores the stat.
  const teamMember = myTeam?.find((member) => member.species === mine);
  const knownSpeed = teamMember ? teamMember.speed : parseSpeed(manualSpeed);

  const addRelation = () => {
    if (!mine) return;
    addNotesSpeedRelation(species, {
      kind,
      mineSpecies: mine,
      mineSpeed: knownSpeed,
      field: { ...field },
    });
    setField({ ...EMPTY_SPEED_FIELD });
    setManualSpeed("");
    setMine(null);
  };

  const fieldToggles: {
    key: keyof Pick<
      SpeedFieldState,
      | "tailwindMine"
      | "tailwindTheirs"
      | "trickRoom"
      | "paralyzedMine"
      | "scarfMine"
      | "priority"
    >;
    label: string;
  }[] = [
    { key: "tailwindMine", label: t("battle.tailwindMine") },
    { key: "tailwindTheirs", label: t("battle.tailwindTheirs") },
    { key: "trickRoom", label: t("calc.trickRoom") },
    { key: "paralyzedMine", label: t("calc.speedParalysis") },
    { key: "scarfMine", label: t("battle.scarf") },
    { key: "priority", label: t("battle.notesFieldPriority") },
  ];

  const kindLabels: Record<SpeedRelationKind, string> = {
    faster: t("battle.notesRelationFaster"),
    slower: t("battle.notesRelationSlower"),
    tie: t("battle.notesRelationTie"),
  };

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {t("battle.notesSpeed")}
      </span>

      {/* The relation being written: kind, my Pokémon, the field then. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(kindLabels) as SpeedRelationKind[]).map((option) => (
          <Button
            key={option}
            type="button"
            variant={kind === option ? "secondary" : "outline"}
            size="xs"
            className={rowHitXsClass}
            aria-pressed={kind === option}
            onClick={() => setKind(option)}
          >
            {kindLabels[option]}
          </Button>
        ))}
      </div>

      {myTeam && myTeam.length > 0 ? (
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label={t("battle.notesPickMineAria")}
        >
          {myTeam.map((member) => (
            <button
              key={member.species}
              type="button"
              onClick={() => setMine(member.species)}
              aria-pressed={mine === member.species}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${mine === member.species ? "border-primary bg-secondary" : ""}`}
            >
              {displayName("species", member.species)}
              <span className="font-mono text-2xs text-muted-foreground">
                {member.speed}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <SpeciesPicker
            value={mine}
            onChange={(next) => setMine(next)}
            label={t("battle.notesMyPokemon")}
            placeholder={t("battle.notesMyPokemon")}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            value={manualSpeed}
            onChange={(event) => setManualSpeed(event.target.value)}
            aria-label={t("battle.notesMySpeed")}
            placeholder={t("battle.notesMySpeed")}
            className="w-24"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {fieldToggles.map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            variant={field[key] ? "secondary" : "outline"}
            size="xs"
            className={`px-1.5 text-2xs ${rowHitXsClass}`}
            aria-pressed={field[key]}
            onClick={() =>
              setField((current) => ({ ...current, [key]: !current[key] }))
            }
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          size="xs"
          className={rowHitXsClass}
          disabled={!mine}
          onClick={addRelation}
        >
          {t("battle.notesAddRelation")}
        </Button>
      </div>

      {mine && knownSpeed === null ? (
        <p className="text-2xs text-muted-foreground">
          {t("battle.notesPlainHint")}
        </p>
      ) : null}

      {/* The noted relations, each removable. */}
      {relations.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {relations.map((relation) => {
            const speed = myNotedSpeed(relation);
            const name = displayName("species", relation.mineSpecies);
            const label =
              relation.kind === "tie"
                ? speed === null
                  ? t("battle.notesTiePlain")
                  : t("battle.notesTieChip", { name, speed })
                : relation.kind === "faster"
                  ? speed === null
                    ? t("battle.notesFasterPlain")
                    : t("battle.notesFasterChip", { name, speed })
                  : speed === null
                    ? t("battle.notesSlowerPlain")
                    : t("battle.notesSlowerChip", { name, speed });
            return (
              <Button
                key={relation.id}
                type="button"
                variant="secondary"
                size="xs"
                className={rowHitXsClass}
                aria-label={t("battle.notesRemoveChip")}
                onClick={() => removeNotesSpeedRelation(species, relation.id)}
              >
                {label}
                {relation.field.priority
                  ? ` · ${t("battle.notesFieldPriority")}`
                  : ""}
              </Button>
            );
          })}
        </div>
      ) : null}

      {/* What the relations add up to. */}
      {relations.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {inconsistent ? (
            t("battle.hintInconsistent")
          ) : (
            <>
              {rangeLabel(t, range)} {hint ? hintLabel(t, hint) : null}
            </>
          )}
          {hasPriority ? ` ${t("battle.notesPriorityCount")}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function parseSpeed(raw: string): number | null {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 && value <= 10000 ? value : null;
}

/** "Speed at least 170", "Speed at most 96", "Speed 100-150". */
function rangeLabel(
  t: ReturnType<typeof useT>,
  range: { min: number | null; max: number | null },
): string {
  if (range.min !== null && range.max !== null) {
    return t("battle.rangeBetween", { min: range.min, max: range.max });
  }
  if (range.min !== null) return t("battle.rangeAtLeast", { min: range.min });
  if (range.max !== null) return t("battle.rangeAtMost", { max: range.max });
  return t("battle.rangePlain");
}

/** The nature-and-item reading of the range. */
function hintLabel(
  t: ReturnType<typeof useT>,
  hint: ReturnType<typeof speedHint>,
): string {
  if (!hint) return "";
  switch (hint.kind) {
    case "scarf":
      return t("battle.hintScarf");
    case "boostMax":
      return t("battle.hintBoostMax", { nature: hint.nature });
    case "boostOrScarf":
      return t("battle.hintBoostOrScarf", { nature: hint.nature });
    case "uninvested":
      return t("battle.hintUninvested", { nature: hint.nature });
    default:
      return "";
  }
}
