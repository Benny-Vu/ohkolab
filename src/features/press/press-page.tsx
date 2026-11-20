import type { ReactNode } from "react";

import { Page } from "@/components/page";
import { useLocale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n/t";

/**
 * The press kit: logos, colours, type, screenshots and ready-to-copy press
 * copy, in English and Japanese. Everything the page hands out is static —
 * the assets live in `public/press/`, so there is no database and no
 * dependency behind it. The brand values shown on the swatches and preview
 * tiles are press-kit content, not styling: a journalist needs the exact
 * hexes and the lockups on the backgrounds they are designed for.
 */

/** One downloadable brand asset, in both SVG and PNG. */
interface LogoAsset {
  slug: string;
  en: string;
  ja: string;
}

const LOGO_ASSETS: LogoAsset[] = [
  {
    slug: "logo-mark-dark",
    en: "Logo mark, dark (for light backgrounds)",
    ja: "ロゴマーク（暗色・明るい背景用）",
  },
  {
    slug: "logo-mark-light",
    en: "Logo mark, light (for dark backgrounds)",
    ja: "ロゴマーク（明色・暗い背景用）",
  },
  {
    slug: "wordmark-dark",
    en: "Wordmark, dark (for light backgrounds)",
    ja: "ワードマーク（暗色・明るい背景用）",
  },
  {
    slug: "wordmark-light",
    en: "Wordmark, light (for dark backgrounds)",
    ja: "ワードマーク（明色・暗い背景用）",
  },
  {
    slug: "lockup-dark",
    en: "Logo lockup, dark (for light backgrounds)",
    ja: "ロゴ（暗色・明るい背景用）",
  },
  {
    slug: "lockup-light",
    en: "Logo lockup, light (for dark backgrounds)",
    ja: "ロゴ（明色・暗い背景用）",
  },
];

/** One phone screenshot of the app, captured in recording mode. */
interface Screenshot {
  file: string;
  en: string;
  ja: string;
}

const SCREENSHOTS: Screenshot[] = [
  { file: "home.png", en: "The community feed", ja: "コミュニティフィード" },
  { file: "calc.png", en: "Damage calculator", ja: "ダメージ計算ツール" },
  { file: "teams.png", en: "Team builder", ja: "構築ツール" },
  {
    file: "meta.png",
    en: "Metagame usage statistics",
    ja: "使用率データ",
  },
  { file: "groups.png", en: "Groups", ja: "グループ" },
  {
    file: "messages.png",
    en: "Direct messages",
    ja: "ダイレクトメッセージ",
  },
];

/** Press copy in both languages; the page always shows both, so a
 * journalist can copy either language whatever the viewer's locale is. */
const PRESS_COPY = {
  shortEn:
    "OHKOLab is a free community and toolkit for Pokémon Champions players: a damage calculator, a team builder with printable team sheets, real usage statistics, groups and direct messages — in English and Japanese.",
  shortJa:
    "OHKOLabは『ポケモンチャンピオンズ』プレイヤーのための無料コミュニティ＆ツールサイトです。ダメージ計算、印刷できる構築シート付きの構築ツール、実際の使用率データ、グループ、ダイレクトメッセージを英語と日本語で提供します。",
  longEn:
    "OHKOLab (ohkolab.com) is a free, unofficial community site for the Pokémon Champions metagame, built by one fan and open to everyone. It brings together the tools competitive players need — a damage calculator with full Doubles and Singles support, a team builder with printable team sheets and shareable team IDs, and usage statistics from the Pokémon Showdown ladder — and a place to use them together: a feed, topic groups and direct messages, where players share teams, find battle partners and talk strategy. The whole site works in English and in Japanese, phone first. OHKOLab is not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.",
  longJa:
    "OHKOLab（ohkolab.com）は『ポケモンチャンピオンズ』のメタゲームのための無料・非公式のコミュニティサイトで、一人のファンが作り、誰でも利用できます。ダブルスとシングルスに完全対応したダメージ計算ツール、印刷できる構築シートと共有可能な構築ID付きの構築ツール、Pokémon Showdownのレーダーから集めた使用率データという対戦プレイヤーに必要なツールと、それを一緒に使える場——投稿フィード、グループ、ダイレクトメッセージ——を備えています。プレイヤーは構築を共有し、対戦相手を見つけ、戦略を語り合えます。サイト全体が英語と日本語の両方に対応し、スマートフォンでも快適に使えます。OHKOLabは任天堂・ゲームフリーク・クリーチャーズ・ポケモンとは一切関係ありません。",
};

export function PressPage() {
  const [locale] = useLocale();
  const japanese = locale === "ja";

  const heading: (en: string, ja: string) => ReactNode = (en, ja) =>
    japanese ? ja : en;

  return (
    <Page title={t("footer.press")} width="narrow">
      <p className="mb-6 text-sm text-muted-foreground">
        {heading(
          "Logos, colours, screenshots and copy for writing or talking about OHKOLab. Everything here is free to use in coverage of the site.",
          "OHKOLabについての記事や動画に使えるロゴ、カラー、スクリーンショット、紹介文です。すべて無料でご利用いただけます。",
        )}
      </p>

      {/* Logos */}
      <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
        {heading("Logo", "ロゴ")}
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        {heading(
          "SVG and PNG of the mark, the wordmark and the full lockup, each in a dark and a light version. Use the dark artwork on light backgrounds and the light artwork on dark backgrounds; keep some space around it.",
          "マーク、ワードマーク、ロゴ一式をSVGとPNGで、暗色と明色の両方を用意しています。明るい背景には暗色を、暗い背景には明色をお使いください。ロゴの周りには余白を残してください。",
        )}
      </p>
      <div className="mb-2 grid gap-3 sm:grid-cols-2">
        <div
          className="flex items-center justify-center rounded-md border p-6"
          style={{ backgroundColor: "#F2F4F7" }}
        >
          <img
            alt="OHKOLab logo lockup, dark artwork"
            className="max-h-16 w-auto"
            src="/press/lockup-dark.svg"
          />
        </div>
        <div
          className="flex items-center justify-center rounded-md border p-6"
          style={{ backgroundColor: "#0B0D10" }}
        >
          <img
            alt="OHKOLab logo lockup, light artwork"
            className="max-h-16 w-auto"
            src="/press/lockup-light.svg"
          />
        </div>
      </div>
      <ul className="mb-8 grid gap-2">
        {LOGO_ASSETS.map((asset) => (
          <li
            key={asset.slug}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-md border bg-card p-3 text-sm"
          >
            <span>{japanese ? asset.ja : asset.en}</span>
            <span className="flex gap-3 font-mono text-xs">
              <a
                className="text-primary underline-offset-4 hover:underline relative after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']"
                href={`/press/${asset.slug}.svg`}
              >
                SVG
              </a>
              <a
                className="text-primary underline-offset-4 hover:underline relative after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']"
                href={`/press/${asset.slug}.png`}
              >
                PNG
              </a>
            </span>
          </li>
        ))}
      </ul>

      {/* Colours and type */}
      <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
        {heading("Colours and fonts", "カラーとフォント")}
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        {heading(
          "The identity is dark-first with a lime accent; the light theme is equivalent. Set body copy in the neutrals, never in the lime.",
          "アイデンティティはダークファーストで、ライムのアクセントカラーがあります。本文はニュートラルな色で組み、ライムは使わないでください。",
        )}
      </p>
      <ul className="mb-8 grid gap-2 sm:grid-cols-3">
        {[
          { hex: "#C8F031", en: "Accent lime", ja: "アクセント（ライム）" },
          {
            hex: "#0B0D10",
            en: "Ink (dark background)",
            ja: "インク（暗背景）",
          },
          {
            hex: "#F2F4F7",
            en: "Paper (light background)",
            ja: "ペーパー（明背景）",
          },
        ].map((swatch) => (
          <li
            key={swatch.hex}
            className="rounded-md border bg-card p-3 text-sm"
          >
            <span
              aria-hidden="true"
              className="mb-2 block h-10 w-full rounded-md border"
              style={{ backgroundColor: swatch.hex }}
            />
            <span className="block">{japanese ? swatch.ja : swatch.en}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {swatch.hex}
            </span>
          </li>
        ))}
      </ul>
      <ul className="mb-8 grid gap-2 text-sm">
        {[
          {
            en: "Barlow Semi Condensed — headings and numbers",
            ja: "Barlow Semi Condensed — 見出しと数字",
          },
          { en: "IBM Plex Sans — body copy", ja: "IBM Plex Sans — 本文" },
          {
            en: "IBM Plex Mono — stats and code",
            ja: "IBM Plex Mono — スタッツとコード",
          },
        ].map((font) => (
          <li key={font.en} className="rounded-md border bg-card p-3">
            {japanese ? font.ja : font.en}
          </li>
        ))}
      </ul>

      {/* Screenshots */}
      <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
        {heading("Screenshots", "スクリーンショット")}
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        {heading(
          "Six phone screenshots of the app, 720×1280 PNG, taken with sample data — no real users appear. Each opens on its own; save it from there.",
          "サンプルデータで撮影したスマートフォン画面のスクリーンショット6枚（720×1280 PNG）です。実在のユーザーは写っていません。それぞれ単独で開くので、そこから保存してください。",
        )}
      </p>
      <ul className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SCREENSHOTS.map((shot) => (
          <li key={shot.file} className="min-w-0">
            <img
              alt={japanese ? shot.ja : shot.en}
              className="w-full rounded-md border"
              height={1280}
              src={`/press/screenshots/${shot.file}`}
              width={720}
            />
            <a
              className="mt-1 block truncate text-xs text-primary underline-offset-4 hover:underline relative after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']"
              download
              href={`/press/screenshots/${shot.file}`}
            >
              {japanese ? shot.ja : shot.en} · PNG
            </a>
          </li>
        ))}
      </ul>

      {/* Press copy */}
      <h2 className="mb-3 font-heading text-lg font-semibold tracking-tight">
        {heading("About OHKOLab", "OHKOLabについて")}
      </h2>
      <div className="mb-6 grid gap-3">
        {[
          { label: "Short (EN)", body: PRESS_COPY.shortEn },
          { label: "Short (JA)", body: PRESS_COPY.shortJa },
          { label: "Long (EN)", body: PRESS_COPY.longEn },
          { label: "Long (JA)", body: PRESS_COPY.longJa },
        ].map((copy) => (
          <div key={copy.label} className="rounded-md border bg-card p-4">
            <p className="mb-1 font-mono text-xs text-muted-foreground">
              {copy.label}
            </p>
            <p className="text-sm">{copy.body}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{t("footer.disclaimer")}</p>
    </Page>
  );
}
