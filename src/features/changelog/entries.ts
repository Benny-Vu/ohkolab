/**
 * The public changelog, newest first. Each entry is one release with a
 * date and a single short user-facing line per language; the page and
 * the "New" dot read this array, so adding a release means adding one
 * entry here at the top. Keep the lines plain and honest — no marketing
 * voice, no exclamation marks — and keep the Japanese in step with the
 * community glossary (ダメージ計算, 構築, ステータスポイント…).
 */
export interface ChangelogEntry {
  /** The release date, ISO (YYYY-MM-DD). */
  date: string;
  /** The one-line summary, English. */
  en: string;
  /** The one-line summary, Japanese. */
  ja: string;
}

export const changelogEntries: readonly ChangelogEntry[] = [
  {
    date: "2026-11-20",
    en: "A leaner site: unused code and text removed. Nothing you see changed.",
    ja: "使われないコードとテキストを削除して、サイトを軽くしました。見た目の変更はありません。",
  },
  {
    date: "2026-11-20",
    en: "Tougher limits on group joins and invites, a clearer security check at sign-in, and a tidier battle board.",
    ja: "グループの参加と招待の制限を強化し、サインインのセキュリティチェックをわかりやすくしました。",
  },
  {
    date: "2026-11-20",
    en: "The battle board: post what you're looking for and find a practice partner.",
    ja: "バトルボードで練習相手を探せるようになりました。",
  },
  {
    date: "2026-11-20",
    en: "Save teams, calc results and posts as images, plus a press kit and tracking links.",
    ja: "構築・計算結果・投稿を画像として保存できるようになり、プレスキットも公開しました。",
  },
  {
    date: "2026-11-20",
    en: "Taps feel instant, pages load faster, and the site follows one written design system.",
    ja: "タップの反応が速くなり、ページも軽くなりました。デザインも統一されました。",
  },
  {
    date: "2026-11-20",
    en: "Player profiles, people to follow, grouped notifications, a welcome flow and language tags.",
    ja: "プレイヤープロフィール、おすすめの人、通知のまとめ表示、ウェルカムフロー、言語タグを追加しました。",
  },
  {
    date: "2026-11-20",
    en: "Champions team IDs, a team preview with natures, and a printable team sheet.",
    ja: "ChampionsのチームID、性格がわかるチームプレビュー、印刷できるチームシートです。",
  },
  {
    date: "2026-11-20",
    en: "llms.txt for AI tools, and a fix so search engines can read the sitemap.",
    ja: "AIツール向けのllms.txtと、検索エンジン向けのサイトマップ修正です。",
  },
  {
    date: "2026-11-19",
    en: "The new look, a social-first home page and a Credits page.",
    ja: "新しいデザイン、ソーシャル中心のホームページ、クレジットページを公開しました。",
  },
  {
    date: "2026-11-19",
    en: "Direct messages (text) are live, and accounts are for players 16 and older.",
    ja: "ダイレクトメッセージ（テキストのみ）を公開しました。利用は16歳以上からです。",
  },
  {
    date: "2026-11-19",
    en: "Share buttons and calc links that reopen the same calculation.",
    ja: "共有ボタンと、同じ計算を再現する計算機リンクです。",
  },
  {
    date: "2026-11-19",
    en: "Team analysis and a doubles damage calculator with a second defender.",
    ja: "構築分析と、2体目の防御側に対応したダブルのダメージ計算機です。",
  },
  {
    date: "2026-11-19",
    en: "Startup downloads cut from 3.5 MB to about 1 MB.",
    ja: "最初の読み込みを約1MBまで軽くしました。",
  },
  {
    date: "2026-11-19",
    en: "Accessibility fixes, proper Japanese texts and a faster first load on phones.",
    ja: "アクセシビリティの修正と、日本語テキストの整備です。",
  },
  {
    date: "2026-11-19",
    en: "The account deletion page and Android release preparation.",
    ja: "アカウント削除ページと、Androidのリリース準備です。",
  },
];
