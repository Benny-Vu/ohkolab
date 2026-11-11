import { calculate, Field, Move, Pokemon, Side } from "@smogon/calc";

import { gen } from "@/data/gen";
import type {
  BattlerState,
  DamageResult,
  FieldState,
  MoveOptions,
  SideState,
} from "@/types/battle";

function toCalcPokemon(battler: BattlerState): Pokemon {
  const { set } = battler;
  const pokemon = new Pokemon(gen, set.species, {
    item: set.item ?? undefined,
    ability: set.ability ?? undefined,
    nature: set.nature,
    // The calc library stores Champions Stat Points in its `evs` field.
    evs: { ...set.statPoints },
    boosts: { ...battler.boosts },
    status: battler.status ?? "",
    gender: set.gender,
  });
  const percent = Math.min(100, Math.max(0, battler.hpPercent));
  pokemon.originalCurHP = Math.max(
    1,
    Math.round((pokemon.maxHP() * percent) / 100),
  );
  return pokemon;
}

function toCalcSide(side: SideState): Side {
  return new Side({
    isReflect: side.reflect,
    isLightScreen: side.lightScreen,
    isAuroraVeil: side.auroraVeil,
    isTailwind: side.tailwind,
    isHelpingHand: side.helpingHand,
    isFriendGuard: side.friendGuard,
    isSR: side.stealthRock,
    spikes: side.spikes,
  });
}

function toCalcField(field: FieldState): Field {
  return new Field({
    gameType: field.format === "doubles" ? "Doubles" : "Singles",
    weather: field.weather ?? undefined,
    terrain: field.terrain ?? undefined,
    isGravity: field.gravity,
    attackerSide: toCalcSide(field.attackerSide),
    defenderSide: toCalcSide(field.defenderSide),
  });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Damage of one move from the attacker into the defender under the given
 * field. `field.attackerSide` is the attacker's side of the field.
 * Throws if the species or move does not exist in Champions.
 */
export function calculateDamage(
  attacker: BattlerState,
  defender: BattlerState,
  moveName: string,
  field: FieldState,
  options: MoveOptions = {},
): DamageResult {
  const attackerPokemon = toCalcPokemon(attacker);
  const defenderPokemon = toCalcPokemon(defender);
  const move = new Move(gen, moveName, {
    ability: attacker.set.ability ?? undefined,
    item: attacker.set.item ?? undefined,
    species: attacker.set.species,
    isCrit: options.crit,
    hits: options.hits,
  });

  const result = calculate(
    gen,
    attackerPokemon,
    defenderPokemon,
    move,
    toCalcField(field),
  );
  const [min, max] = result.range();
  const defenderMaxHp = defenderPokemon.maxHP();

  let description = "";
  let koText = "";
  if (max > 0) {
    // The library throws while describing some zero-damage edge cases.
    try {
      description = result.fullDesc();
      koText = result.kochance().text;
    } catch {
      description = "";
    }
  }

  return {
    move: move.name,
    min,
    max,
    minPercent: round1((min / defenderMaxHp) * 100),
    maxPercent: round1((max / defenderMaxHp) * 100),
    defenderMaxHp,
    description,
    koText,
  };
}
