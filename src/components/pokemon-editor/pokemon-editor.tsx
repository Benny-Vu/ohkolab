import { useId } from "react";

import { PokemonSprite } from "@/components/pokemon-sprite";
import { TypeBadge } from "@/components/type-badge";
import {
  createDefaultSet,
  getSpecies,
  listItemsFor,
  listMoves,
  listNatures,
  listSpecies,
  MAX_SP_PER_STAT,
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

export interface SpeciesPickerProps {
  /** Selected species name, or null when nothing is picked yet. */
  value: string | null;
  onChange: (species: string) => void;
  allowBattleOnly?: boolean;
  placeholder?: string;
  className?: string;
}

const fieldClass =
  "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** Picks one species from the Champions roster. */
export function SpeciesPicker({
  value,
  onChange,
  allowBattleOnly = false,
  placeholder = "Choose a Pokémon",
  className,
}: SpeciesPickerProps) {
  return (
    <select
      aria-label="Species"
      className={cn(fieldClass, className)}
      value={value ?? ""}
      onChange={(event) => {
        if (event.target.value) onChange(event.target.value);
      }}
    >
      <option value="">{placeholder}</option>
      {listSpecies({ includeBattleOnly: allowBattleOnly }).map((species) => (
        <option key={species.name} value={species.name}>
          {species.name}
        </option>
      ))}
    </select>
  );
}

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
  const info = getSpecies(value.species);
  const update = (patch: Partial<PokemonSet>) =>
    onChange({ ...value, ...patch });

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex items-center gap-3">
        <PokemonSprite species={value.species} size={64} />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <SpeciesPicker
            value={value.species}
            allowBattleOnly={allowBattleOnly}
            onChange={(species) => onChange(createDefaultSet(species))}
          />
          <div className="flex gap-1">
            {info?.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label
          className="grid gap-1 text-xs text-muted-foreground"
          htmlFor={`${id}-item`}
        >
          Item
          <select
            id={`${id}-item`}
            className={fieldClass}
            value={value.item ?? ""}
            onChange={(event) => update({ item: event.target.value || null })}
          >
            <option value="">None</option>
            {listItemsFor(value.species).map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label
          className="grid gap-1 text-xs text-muted-foreground"
          htmlFor={`${id}-ability`}
        >
          Ability
          <select
            id={`${id}-ability`}
            className={fieldClass}
            value={value.ability ?? ""}
            onChange={(event) =>
              update({ ability: event.target.value || null })
            }
          >
            {info?.abilities.map((ability) => (
              <option key={ability} value={ability}>
                {ability}
              </option>
            ))}
          </select>
        </label>
        <label
          className="col-span-2 grid gap-1 text-xs text-muted-foreground"
          htmlFor={`${id}-nature`}
        >
          Nature
          <select
            id={`${id}-nature`}
            className={fieldClass}
            value={value.nature}
            onChange={(event) => update({ nature: event.target.value })}
          >
            {listNatures().map((nature) => (
              <option key={nature.name} value={nature.name}>
                {nature.name}
                {nature.plus && nature.minus
                  ? ` (+${STAT_LABELS[nature.plus]}, -${STAT_LABELS[nature.minus]})`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <legend className="mb-1 text-xs text-muted-foreground">
          Stat Points
        </legend>
        {STAT_IDS.map((stat) => (
          <label
            key={stat}
            className="grid gap-1 text-xs text-muted-foreground"
          >
            {STAT_LABELS[stat]}
            <input
              type="number"
              min={0}
              max={MAX_SP_PER_STAT}
              className={fieldClass}
              value={value.statPoints[stat]}
              onChange={(event) => {
                const points = Math.min(
                  MAX_SP_PER_STAT,
                  Math.max(0, Math.trunc(Number(event.target.value) || 0)),
                );
                update({ statPoints: { ...value.statPoints, [stat]: points } });
              }}
            />
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-xs text-muted-foreground">Moves</legend>
        {value.moves.map((move, index) => (
          <select
            key={index}
            aria-label={`Move ${index + 1}`}
            className={fieldClass}
            value={move ?? ""}
            onChange={(event) => {
              const moves: PokemonSet["moves"] = [...value.moves];
              moves[index] = event.target.value || null;
              update({ moves });
            }}
          >
            <option value="">(none)</option>
            {listMoves().map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        ))}
      </fieldset>
    </div>
  );
}
