/**
 * The Japanese half of the Shell dictionary. It lives in its own
 * file (and its own chunk) so the entry bundle only carries the English
 * strings; `ja.ts` imports it from the lazily loaded Japanese dictionary.
 * The keys and their English source of truth stay in `shell.ts`.
 */
import type { ShellKey } from "@/lib/i18n/entries/shell";

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

  // アクセシビリティ対応（quality ウェーブ）：ホームリンクとテーマ切り替え。
  "nav.homeAria": "OHKOLab ホーム",
  "theme.toLight": "ライトテーマに切り替える",
  "theme.toDark": "ダークテーマに切り替える",
};
