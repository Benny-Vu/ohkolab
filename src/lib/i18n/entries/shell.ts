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
  "account.menuAria": "Account menu",
  "account.moderationItem": "Moderation",

  // Shared calc-facing components (damage meter). Lives here, not tools.ts,
  // because the tools dictionary is stream-owned during the japanese-2 wave.
  "calc.damageMeterAria": "HP left after the hit: {min} to {max} percent",

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

  // The Pokémon set editor (species/item/ability/nature/moves/Stat Points),
  // shared by the calc, the team builder and the avatar pickers.
  "pokemonEditor.species": "Species",
  "pokemonEditor.searchSpecies": "Search Pokémon",
  "pokemonEditor.searchSpeciesPlaceholder": "Search Pokémon or type…",
  "pokemonEditor.noSpecies": "No Pokémon found.",
  "pokemonEditor.chooseSpecies": "Choose a Pokémon",
  "pokemonEditor.move": "Move",
  "pokemonEditor.moveSlot": "Move {n}",
  "pokemonEditor.searchMoves": "Search moves",
  "pokemonEditor.searchMovesPlaceholder": "Search moves or type…",
  "pokemonEditor.noMove": "No move found.",
  "pokemonEditor.allMoves": "All moves",
  "pokemonEditor.allMovesLoading": "All moves (loading learnset…)",
  "pokemonEditor.learnedBy": "Learned by {name}",
  "pokemonEditor.otherMoves": "Other moves",
  "pokemonEditor.item": "Item",
  "pokemonEditor.searchItems": "Search items",
  "pokemonEditor.searchItemsPlaceholder": "Search items or effects…",
  "pokemonEditor.noItem": "No item found.",
  "pokemonEditor.none": "None",
  "pokemonEditor.megaStones": "Mega Stones",
  "pokemonEditor.items": "Items",
  "pokemonEditor.ability": "Ability",
  "pokemonEditor.searchAbilities": "Search abilities",
  "pokemonEditor.searchAbilitiesPlaceholder": "Search abilities…",
  "pokemonEditor.noAbility": "No ability found.",
  "pokemonEditor.chooseAbility": "Choose an ability",
  "pokemonEditor.nature": "Nature",
  "pokemonEditor.searchNatures": "Search natures",
  "pokemonEditor.searchNaturesPlaceholder": "Search natures or stats…",
  "pokemonEditor.noNature": "No nature found.",
  "pokemonEditor.neutral": "Neutral",
  "pokemonEditor.statPoints": "Stat Points",
  "pokemonEditor.spLeft": "{n} left",
  "pokemonEditor.finalStat": "Final {stat}",
  "pokemonEditor.moves": "Moves",
  "pokemonEditor.power": "Power",
  "pokemonEditor.accuracy": "Accuracy",
  "pokemonEditor.clear": "Clear {label}",

  // The global search palette (Ctrl/⌘K).
  "search.openAria": "Search Pokémon, moves, players",
  "search.placeholder": "Search Pokémon, moves, players",
  "search.noResults": "No results.",
  "search.pages": "Pages",
  "search.pokemon": "Pokémon",
  "search.moves": "Moves",
  "search.items": "Items",

  // The offline notice in the native apps (web never shows it).
  "shell.offlineNotice": "You're offline. Some content may not load.",
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
  "account.menuAria": "アカウントメニュー",
  "account.moderationItem": "モデレーション",

  "calc.damageMeterAria": "ヒット後の残りHP：{min}〜{max}％",

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
  "footer.madeBy": "OHKOLabの制作:",
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

  // ポケモンのセット編集（種族・もちもの・特性・せいかく・技・SP）。
  // 計算ツール・構築・アバター選択で共通。
  "pokemonEditor.species": "ポケモン",
  "pokemonEditor.searchSpecies": "ポケモンを検索",
  "pokemonEditor.searchSpeciesPlaceholder": "ポケモン名やタイプで検索…",
  "pokemonEditor.noSpecies": "該当するポケモンはいません。",
  "pokemonEditor.chooseSpecies": "ポケモンを選ぶ",
  "pokemonEditor.move": "技",
  "pokemonEditor.moveSlot": "技{n}",
  "pokemonEditor.searchMoves": "技を検索",
  "pokemonEditor.searchMovesPlaceholder": "技名やタイプで検索…",
  "pokemonEditor.noMove": "該当する技はありません。",
  "pokemonEditor.allMoves": "すべての技",
  "pokemonEditor.allMovesLoading": "すべての技（覚える技を読み込み中…）",
  "pokemonEditor.learnedBy": "{name}が覚える技",
  "pokemonEditor.otherMoves": "その他の技",
  "pokemonEditor.item": "もちもの",
  "pokemonEditor.searchItems": "もちものを検索",
  "pokemonEditor.searchItemsPlaceholder": "名前や効果で検索…",
  "pokemonEditor.noItem": "該当するもちものはありません。",
  "pokemonEditor.none": "なし",
  "pokemonEditor.megaStones": "メガストーン",
  "pokemonEditor.items": "もちもの",
  "pokemonEditor.ability": "特性",
  "pokemonEditor.searchAbilities": "特性を検索",
  "pokemonEditor.searchAbilitiesPlaceholder": "特性名で検索…",
  "pokemonEditor.noAbility": "該当する特性はありません。",
  "pokemonEditor.chooseAbility": "特性を選ぶ",
  "pokemonEditor.nature": "せいかく",
  "pokemonEditor.searchNatures": "せいかくを検索",
  "pokemonEditor.searchNaturesPlaceholder": "せいかくやステータスで検索…",
  "pokemonEditor.noNature": "該当するせいかくはありません。",
  "pokemonEditor.neutral": "補正なし",
  "pokemonEditor.statPoints": "ステータスポイント（SP）",
  "pokemonEditor.spLeft": "残り {n}",
  "pokemonEditor.finalStat": "最終{stat}",
  "pokemonEditor.moves": "技",
  "pokemonEditor.power": "威力",
  "pokemonEditor.accuracy": "命中",
  "pokemonEditor.clear": "{label}をクリア",

  // グローバル検索パレット（Ctrl/⌘K）。
  "search.openAria": "ポケモン・技・プレイヤーを検索",
  "search.placeholder": "ポケモン・技・プレイヤーを検索",
  "search.noResults": "見つかりません。",
  "search.pages": "ページ",
  "search.pokemon": "ポケモン",
  "search.moves": "技",
  "search.items": "もちもの",

  // ネイティブアプリのオフライン表示（ウェブでは出ない）。
  "shell.offlineNotice": "オフラインのため、一部のコンテンツを読み込めません。",
};
