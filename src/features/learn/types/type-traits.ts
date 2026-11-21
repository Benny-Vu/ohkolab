import type { LocalizedText } from "@/features/learn/guides";
import type { TypeName } from "@/types/pokemon";

/**
 * The special properties each type has, beyond what the type chart shows.
 * Every line is verified against Champions as the app models it —
 * @smogon/calc generation 0 mechanics and @pkmn/dex SV data — by
 * `type-traits.test.ts`; a type with no verified traits is absent here
 * and renders no Traits section. A list of the traits the owner asked
 * for that could not be verified lives in the types stream report.
 */
export const TYPE_TRAITS: Partial<Record<TypeName, readonly LocalizedText[]>> =
  {
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
        en: "Toxic from a Poison type never misses.",
        ja: "どくタイプが使う「どくどく」は必ず命中する。",
      },
    ],
    Ice: [
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
    ],
    Dark: [
      {
        en: "Immune to status moves given priority by Prankster.",
        ja: "とくせい「いたずらごころ」で先制された変化技は効かない。",
      },
    ],
  };

/** The types that have at least one verified trait, in TYPE_NAMES order. */
export const TYPES_WITH_TRAITS: readonly TypeName[] = Object.keys(
  TYPE_TRAITS,
) as TypeName[];
