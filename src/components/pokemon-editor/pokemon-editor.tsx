import { useId } from "react";

import { AbilityPicker } from "@/components/pokemon-editor/ability-picker";
import { ItemPicker } from "@/components/pokemon-editor/item-picker";
import { MovePicker } from "@/components/pokemon-editor/move-picker";
import { NaturePicker } from "@/components/pokemon-editor/nature-picker";
import { SpeciesPicker } from "@/components/pokemon-editor/species-picker";
import {
  remainingStatPoints,
  withStatPoints,
} from "@/components/pokemon-editor/stat-points";
import { PokemonSprite } from "@/components/pokemon-sprite";
import { TypeBadge } from "@/components/type-badge";
import {
  calcStats,
  createDefaultSet,
  getSpecies,
  MAX_SP_PER_STAT,
  MAX_SP_TOTAL,
  resolveBattleForme,
} from "@/data";
import { cn } from "@/lib/utils";
import { STAT_IDS, STAT_LABELS, type PokemonSet } from "@/types/pokemon";

export interface PokemonEditorProps {
  value: PokemonSet;
  onChange: (next: PokemonSet) => void;
  /** Let Megas and other in-battle formes be picked as the species (the calc needs this). */
  allowBattleOnly?: boolean;
  className?: string;
}

const fieldClass =
  "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/**
 * Edits one Pokémon set: species, item, ability, nature, Stat Points and
 * moves. Controlled: it never keeps its own copy of the set.
 */
export function PokemonEditor({
  value,
  onChange,
  allowBattleOnly = false,
  className,
}: PokemonEditorProps) {
  const id = useId();
  const update = (patch: Partial<PokemonSet>) =>
    onChange({ ...value, ...patch });

  // A Mega Stone turns the set into its Mega forme in battle, so the editor
  // shows that forme's sprite, types and stats.
  const battleForme = resolveBattleForme(value.species, value.item);
  const formeInfo = getSpecies(battleForme);
  const finalStats = calcStats({
    species: battleForme,
    nature: value.nature,
    statPoints: value.statPoints,
  });
  const remaining = remainingStatPoints(value.statPoints);

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex items-center gap-3">
        <PokemonSprite species={battleForme} size={64} />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <SpeciesPicker
            value={value.species}
            allowBattleOnly={allowBattleOnly}
            onChange={(species) => onChange(createDefaultSet(species))}
          />
          <div className="flex gap-1">
            {formeInfo?.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
          {battleForme !== value.species ? (
            <p className="text-xs text-muted-foreground">{battleForme}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label
          className="grid gap-1 text-xs text-muted-foreground"
          htmlFor={`${id}-item`}
        >
          Item
          <ItemPicker
            id={`${id}-item`}
            value={value.item}
            onChange={(item) => update({ item })}
            species={value.species}
          />
        </label>
        <label
          className="grid gap-1 text-xs text-muted-foreground"
          htmlFor={`${id}-ability`}
        >
          Ability
          <AbilityPicker
            id={`${id}-ability`}
            value={value.ability}
            onChange={(ability) => update({ ability })}
            species={value.species}
          />
        </label>
        <label
          className="col-span-2 grid gap-1 text-xs text-muted-foreground"
          htmlFor={`${id}-nature`}
        >
          Nature
          <NaturePicker
            id={`${id}-nature`}
            value={value.nature}
            onChange={(nature) => update({ nature })}
          />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="flex w-full items-baseline justify-between gap-2 text-xs text-muted-foreground">
          Stat Points
          <span aria-live="polite" className="tabular-nums">
            {remaining} of {MAX_SP_TOTAL} remaining
          </span>
        </legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STAT_IDS.map((stat) => (
            <div key={stat} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-1">
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor={`${id}-sp-${stat}`}
                >
                  {STAT_LABELS[stat]}
                </label>
                <span className="text-xs tabular-nums text-foreground">
                  <span className="sr-only">{`Final ${STAT_LABELS[stat]} `}</span>
                  {finalStats[stat]}
                </span>
              </div>
              <input
                id={`${id}-sp-${stat}`}
                type="number"
                min={0}
                max={MAX_SP_PER_STAT}
                className={fieldClass}
                value={value.statPoints[stat]}
                onChange={(event) =>
                  update({
                    statPoints: withStatPoints(
                      value.statPoints,
                      stat,
                      Number(event.target.value),
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-xs text-muted-foreground">Moves</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {value.moves.map((move, index) => (
            <MovePicker
              key={index}
              label={`Move ${index + 1}`}
              value={move}
              species={value.species}
              exclude={value.moves.filter((_, slot) => slot !== index)}
              onChange={(next) => {
                const moves: PokemonSet["moves"] = [...value.moves];
                moves[index] = next;
                update({ moves });
              }}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
