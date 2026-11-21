import type { LocalizedText } from "@/features/learn/guides";
import type { TypeName } from "@/types/pokemon";

/**
 * The special properties each type has, beyond what the type chart shows.
 *
 * Two kinds of line, both checked by `type-traits.test.ts`:
 * - damage and data facts verified against Champions as the app models it
 *   (@smogon/calc generation 0 and @pkmn/dex SV data): the weather
 *   defence boosts, groundedness, Toxic, Sheer Cold, Prankster;
 * - the type immunities to status and effects (burn, paralysis, freeze,
 *   poison, powder moves, Leech Seed, trapping, sand damage). The calc
 *   models damage only, so these are the main-series (Scarlet/Violet)
 *   rules Champions is built on. Champions changed status *chances and
 *   durations* (paralysis 12.5%, sleep and freeze end by turn 3) but no
 *   source documents a change to these immunities; the test still checks
 *   that every move a line names exists in Champions.
 * A type with no traits is absent here and renders no Traits section.
 */
export const TYPE_TRAITS: Partial<Record<TypeName, readonly LocalizedText[]>> =
  {
    Fire: [{ en: "Can't be burned.", ja: "やけど状態にならない。" }],
    Electric: [{ en: "Can't be paralyzed.", ja: "まひ状態にならない。" }],
    Grass: [
      {
        en: "Immune to powder and spore moves, such as Spore, Sleep Powder and Rage Powder.",
        ja: "キノコのほうし、ねむりごな、いかりのこななど、粉や胞子の技が効かない。",
      },
      {
        en: "Can't be seeded by Leech Seed.",
        ja: "「やどりぎのタネ」が効かない。",
      },
    ],
    Ground: [
      { en: "Thunder Wave doesn't affect it.", ja: "「でんじは」が効かない。" },
      {
        en: "Takes no damage from a sandstorm.",
        ja: "砂嵐のダメージを受けない。",
      },
    ],
    Flying: [
      {
        en: "Never grounded, so grounded-only effects miss it: entry hazards like Spikes and terrain.",
        ja: "浮いているため、まきびしやフィールドなど、地面にいるポケモンだけに効く効果を受けない。",
      },
      {
        en: "Levitate gives any type the same immunity to Ground moves.",
        ja: "とくせい「ふゆう」なら、タイプに関係なく地面の技が効かない。",
      },
    ],
    Poison: [
      {
        en: "Can't be poisoned or badly poisoned.",
        ja: "どく・もうどく状態にならない。",
      },
      {
        en: "Toxic from a Poison type never misses.",
        ja: "どくタイプが使う「どくどく」は必ず命中する。",
      },
    ],
    Ice: [
      { en: "Can't be frozen.", ja: "こおり状態にならない。" },
      {
        en: "Gets 1.5× Defense in snow.",
        ja: "天候が雪の間、防御が1.5倍になる。",
      },
      {
        en: "Immune to Sheer Cold.",
        ja: "「ぜったいれいど」が効かない。",
      },
    ],
    Rock: [
      {
        en: "Gets 1.5× Special Defense in a sandstorm.",
        ja: "天候が砂嵐の間、特防が1.5倍になる。",
      },
      {
        en: "Takes no damage from a sandstorm.",
        ja: "砂嵐のダメージを受けない。",
      },
    ],
    Ghost: [
      {
        en: "Can't be trapped: it can always switch out, even against Block or Mean Look.",
        ja: "「とおせんぼう」や「くろいまなざし」を受けても、いつでも交代できる。",
      },
    ],
    Dark: [
      {
        en: "Immune to status moves given priority by Prankster.",
        ja: "とくせい「いたずらごころ」で先制された変化技は効かない。",
      },
    ],
    Steel: [
      {
        en: "Can't be poisoned or badly poisoned.",
        ja: "どく・もうどく状態にならない。",
      },
      {
        en: "Takes no damage from a sandstorm.",
        ja: "砂嵐のダメージを受けない。",
      },
    ],
  };

/** The types that have at least one verified trait, in TYPE_NAMES order. */
export const TYPES_WITH_TRAITS: readonly TypeName[] = Object.keys(
  TYPE_TRAITS,
) as TypeName[];
