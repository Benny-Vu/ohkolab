import type { ReactNode } from "react";
import { Link } from "react-router";

import { Page } from "@/components/page";
import { useLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/t";

/**
 * The credits page: every data source and library OHKOLab is built on, with
 * the licence each is distributed under. Licence names and copyright notices
 * come from the packages and their sources, not from memory. The Japanese
 * half renders the same list; PokéAPI's copyright notice stays verbatim
 * (its BSD licence asks for it) in both languages.
 */

interface Source {
  name: string;
  what: string;
  licence: string;
  notice?: string;
  href: string;
}

const EN_SOURCES: Source[] = [
  {
    name: "PokéAPI",
    what: "Japanese Pokémon names.",
    licence: "BSD 3-Clause License",
    notice:
      "Copyright (c) © 2013–2023 Paul Hallett and PokéAPI contributors (https://github.com/PokeAPI/pokeapi#contributing). Pokémon and Pokémon character names are trademarks of Nintendo.",
    href: "https://pokeapi.co",
  },
  {
    name: "@pkmn/dex, @pkmn/data and @pkmn/img",
    what: "Pokémon data, learnsets and sprites.",
    licence: "MIT License",
    href: "https://github.com/smogon/pokemon-showdown-client",
  },
  {
    name: "@smogon/calc",
    what: "The damage calculator.",
    licence: "MIT License",
    href: "https://github.com/smogon/pokemon-calc",
  },
  {
    name: "Smogon University usage statistics",
    what: "Metagame usage data from the Pokémon Showdown ladder.",
    licence: "Published by Smogon University for public use.",
    href: "https://www.smogon.com/stats/",
  },
  {
    name: "Limitless",
    what: "Tournament results and team sheets for the Top teams view.",
    licence: "Public API; tournament data is attributed and linked per team.",
    href: "https://play.limitlesstcg.com",
  },
  {
    name: "Barlow Semi Condensed, IBM Plex Sans and IBM Plex Mono",
    what: "Typefaces, served through Fontsource.",
    licence: "SIL Open Font License 1.1",
    href: "https://fontsource.org",
  },
  {
    name: "lucide icons",
    what: "Interface icons.",
    licence: "ISC License",
    href: "https://lucide.dev",
  },
  {
    name: "Radix UI, shadcn/ui and Tailwind CSS",
    what: "Interface components and styling.",
    licence: "MIT License",
    notice: "shadcn/ui: Copyright (c) 2023 shadcn",
    href: "https://www.radix-ui.com",
  },
];

const JA_SOURCES: Source[] = [
  {
    name: "PokéAPI",
    what: "日本語のポケモン名。",
    licence: "BSD 3-Clause License（3条項BSDライセンス）",
    notice:
      "Copyright (c) © 2013–2023 Paul Hallett and PokéAPI contributors (https://github.com/PokeAPI/pokeapi#contributing). Pokémon and Pokémon character names are trademarks of Nintendo.",
    href: "https://pokeapi.co",
  },
  {
    name: "@pkmn/dex、@pkmn/data、@pkmn/img",
    what: "ポケモンデータ・覚える技・スプライト。",
    licence: "MIT License",
    href: "https://github.com/smogon/pokemon-showdown-client",
  },
  {
    name: "@smogon/calc",
    what: "ダメージ計算エンジン。",
    licence: "MIT License",
    href: "https://github.com/smogon/pokemon-calc",
  },
  {
    name: "Smogon University（ポケモン対戦データ）",
    what: "Pokémon Showdownのレーダーから集めた使用率データ。",
    licence: "Smogon Universityが公開しているデータ。",
    href: "https://www.smogon.com/stats/",
  },
  {
    name: "Limitless",
    what: "上位構築ビューの大会結果と公開チームシート。",
    licence: "公開API。大会データは出典明記とリンク付きで表示しています。",
    href: "https://play.limitlesstcg.com",
  },
  {
    name: "Barlow Semi Condensed、IBM Plex Sans、IBM Plex Mono",
    what: "フォント（Fontsource経由で配信）。",
    licence: "SIL Open Font License 1.1",
    href: "https://fontsource.org",
  },
  {
    name: "lucideアイコン",
    what: "インターフェースのアイコン。",
    licence: "ISC License",
    href: "https://lucide.dev",
  },
  {
    name: "Radix UI、shadcn/ui、Tailwind CSS",
    what: "UIコンポーネントとスタイリング。",
    licence: "MIT License",
    notice: "shadcn/ui: Copyright (c) 2023 shadcn",
    href: "https://www.radix-ui.com",
  },
];

function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ul className="grid gap-3">
      {sources.map((source) => (
        <li
          key={source.name}
          className="min-w-0 rounded-md border bg-card p-4 text-sm"
        >
          <a
            className="font-medium underline-offset-4 hover:underline"
            href={source.href}
            rel="noreferrer"
            target="_blank"
          >
            {source.name}
          </a>
          <p className="mt-1 text-muted-foreground">{source.what}</p>
          <p className="mt-1 text-xs text-muted-foreground">{source.licence}</p>
          {source.notice && (
            <p className="mt-2 rounded-md wrap-anywhere bg-surface-sunken p-2 font-mono text-xs text-muted-foreground">
              {source.notice}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CreditsPage() {
  const [locale] = useLocale();
  const japanese = locale === "ja";
  const sources = japanese ? JA_SOURCES : EN_SOURCES;

  const heading: (en: string, ja: string) => ReactNode = (en, ja) =>
    japanese ? ja : en;

  return (
    <Page title={t("footer.credits")} width="narrow">
      <p className="mb-4 text-sm text-muted-foreground">
        {heading(
          "OHKOLab stands on these data sources and libraries. Each entry names what we use it for and the licence it is distributed under.",
          "OHKOLabはこれらのデータソースとライブラリの上に成り立っています。どこで使っているか、どのライセンスで配布されているかを記載しています。",
        )}
      </p>
      <SourceList sources={sources} />
      <p className="mt-6 text-sm text-muted-foreground">
        {heading(
          "Need logos and screenshots? See the press kit.",
          "ロゴとスクリーンショットはプレスキットにあります。",
        )}{" "}
        <Link
          className="text-primary underline underline-offset-4 hover:underline"
          to="/press"
        >
          {heading("Press kit", "プレスキット")}
        </Link>
      </p>
      <p className="mt-6 text-xs text-muted-foreground">
        {t("footer.disclaimer")}
      </p>
    </Page>
  );
}
