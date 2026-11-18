/**
 * The shell dictionary: navigation, the app frame (header, footer, search,
 * account menu) and the strings every feature reuses (common actions and
 * states). Owned by the lead; the Japanese side must keep exactly the same
 * keys (the parity test enforces it).
 */

export const shellEn = {
  // Navigation (header, phone tab bar, account menu).
  "nav.home": "Home",
  "nav.calc": "Calc",
  "nav.teams": "Teams",
  "nav.meta": "Meta",
  "nav.profile": "Profile",
  "nav.main": "Main",

  // The language switch (footer and profile settings).
  "language.label": "Language",
  "language.english": "English",
  "language.japanese": "日本語",

  // Footer.
  "footer.disclaimer":
    "OHKOLab is an unofficial fan project, not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.",
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",
  "footer.sendFeedback": "Send feedback",
  "footer.madeBy": "OHKOLab is made by",
  "footer.japaneseNames": "Japanese Pokémon names from PokéAPI",

  // Common actions and states, reused across features.
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.remove": "Remove",
  "common.edit": "Edit",
  "common.done": "Done",
  "common.loading": "Loading…",
  "common.retry": "Try again",
  "common.back": "Back",
  "common.close": "Close",
  "common.search": "Search",
  "common.signIn": "Sign in",
  "common.signOut": "Sign out",
  "common.signedOut": "Signed out",
} as const;

export type ShellKey = keyof typeof shellEn;

export const shellJa: { [K in ShellKey]: string } = {
  // ナビゲーション（ヘッダー、スマホのタブバー、アカウントメニュー）。
  "nav.home": "ホーム",
  "nav.calc": "計算",
  "nav.teams": "構築",
  "nav.meta": "環境",
  "nav.profile": "プロフィール",
  "nav.main": "メイン",

  // 言語切り替え（フッターとプロフィール設定）。
  "language.label": "言語",
  "language.english": "English",
  "language.japanese": "日本語",

  // フッター。
  "footer.disclaimer":
    "OHKOLabは非公式のファンプロジェクトであり、任天堂・ゲームフリーク・クリーチャーズ・ポケモンとは一切関係ありません。",
  "footer.terms": "利用規約",
  "footer.privacy": "プライバシー",
  "footer.sendFeedback": "フィードバックを送る",
  "footer.madeBy": "OHKOLab is made by Vu Forge",
  "footer.japaneseNames": "日本語のポケモン名はPokéAPIのデータを使用しています",

  // 各機能で共通のアクションと状態。
  "common.cancel": "キャンセル",
  "common.save": "保存",
  "common.delete": "削除",
  "common.remove": "削除する",
  "common.edit": "編集",
  "common.done": "完了",
  "common.loading": "読み込み中…",
  "common.retry": "もう一度試す",
  "common.back": "戻る",
  "common.close": "閉じる",
  "common.search": "検索",
  "common.signIn": "サインイン",
  "common.signOut": "サインアウト",
  "common.signedOut": "サインアウトしました",
};
