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
  // 対戦ボードのナビラベルはエントリグラフで描画されるため、ここに置く。
  "nav.battles": "対戦",
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
  "footer.learn": "はじめに",
  "footer.terms": "利用規約",
  "footer.privacy": "プライバシー",
  "footer.credits": "クレジット",
  "footer.press": "プレスキット",
  "footer.sendFeedback": "フィードバックを送る",
  "footer.madeBy": "OHKOLabの制作:",

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
  "common.backToHome": "ホームに戻る",

  // 生年月日（一度だけ尋ねる。VITE_DIRECT_MESSAGES のフラグ付き）。
  "birthDate.label": "生年月日",
  "birthDate.hint":
    "若いプレイヤーの安全のために使います。他のプレイヤーには表示されません。",
  "birthDate.invalid": "正しい日付を入力してください。",
  "birthDate.tooYoung": "16歳以上である必要があります。",
  "birthDate.saved": "生年月日を保存しました。",
  "birthDate.saveFailed":
    "生年月日を保存できませんでした。もう一度お試しください。",
  "birthDate.none": "未設定",
  "birthDate.promptTitle": "生年月日を追加",
  "birthDate.promptBody":
    "若いプレイヤーの安全のためのもので、他のプレイヤーには表示されません。追加するまで、友達とだけメッセージできます。",
  "birthDate.later": "後で",
  "common.close": "閉じる",
  "common.search": "検索",
  "common.noResults": "見つかりません",
  "common.signIn": "サインイン",
  "common.signUp": "サインアップ",
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
  "search.paletteTitle": "検索",
  "search.paletteDescription": "ポケモン、技、道具、ページを検索します。",
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

  // バリデーションメッセージ（src/lib/auth/validation.ts）。エントリー側で
  // 表示されるためシェルに置く（オンボーディングと認証プロバイダー）。
  "auth.usernameRules":
    "3〜20文字。半角小文字・数字・アンダースコアが使えます。",
  "auth.errUsernameChoose": "ユーザー名を入力してください。",
  "auth.errUsernameNew": "新しいユーザー名を選んでください。",
  "auth.errUsernameMin": "ユーザー名は{min}文字以上にしてください。",
  "auth.errUsernameMax": "ユーザー名は{max}文字以内にしてください。",
  "auth.errUsernamePattern":
    "ユーザー名には半角小文字・数字・アンダースコアのみ使えます。",
  "auth.errDisplayNameMax": "表示名は{max}文字以内にしてください。",
  "auth.errBioMax": "プロフィールは{max}文字以内にしてください。",
  "auth.errAvatarSpecies": "そのポケモンはアバターに使えません。",
  "auth.errLookingForMax": "{max}文字以内にしてください。",
  "auth.errShowdownMax": "ポケモン対戦の名前は{max}文字以内です。",
  "auth.errProfileUrl": "リンクはhttps://ではじめてください。",
  "auth.errEmailEmpty": "メールアドレスを入力してください。",
  "auth.errEmailInvalid": "有効なメールアドレスを入力してください。",
  "auth.errPasswordEmpty": "パスワードを入力してください。",
  "auth.errPasswordChoose": "パスワードを決めてください。",
  "auth.errPasswordMin": "パスワードは{min}文字以上にしてください。",
  "auth.errPasswordMax": "パスワードは{max}文字以内にしてください。",

  // 認証エラーメッセージ（src/lib/auth/errors.ts）。
  "auth.errNotConfigured":
    "このビルドではアカウント機能は利用できません。ツールはアカウントなしでも使えます。",
  "auth.errUnavailable":
    "アカウント機能はまだ完全に設定されていません。後でもう一度お試しください。",
  "auth.errInvalidInput":
    "入力内容を受け付けられませんでした。確認してもう一度お試しください。",
  "auth.errInvalidCredentials": "メールアドレスまたはパスワードが違います。",
  "auth.errEmailNotConfirmed":
    "まずメールアドレスを確認してください。送信したリンクを開いてからサインインしてください。",
  "auth.errEmailTaken":
    "このメールアドレスのアカウントが既に存在する可能性があります。サインインするか、パスワードをリセットしてください。",
  "auth.errWeakPassword":
    "そのパスワードは推測されやすすぎます。より強いものを選んでください。",
  "auth.errRateLimited":
    "試行回数が多すぎます。しばらく待ってからもう一度お試しください。",
  "auth.errProviderUnavailable": "このサインイン方法はまだ利用できません。",
  "auth.errUsernameTaken":
    "そのユーザー名は既に使われています。別のものを選んでください。",
  "auth.errSessionExpired":
    "セッションの有効期限が切れました。もう一度サインインしてください。",
  "auth.errLinkInvalid":
    "このリンクはもう有効ではありません。期限切れ、使用済み、または別のブラウザで開かれた可能性があります。新しいリンクを請求してください。",
  "auth.errForbidden": "この操作は許可されていません。",
  "auth.errNetwork":
    "サーバーに接続できませんでした。通信状況を確認してもう一度お試しください。",
  "auth.errUnknown": "問題が発生しました。もう一度お試しください。",
  "auth.errSamePassword":
    "新しいパスワードは現在のものと違うものにしてください。",
  "auth.errSignupDisabled": "現在、新規登録は受け付けていません。",
  "auth.errReauth":
    "セキュリティのため、パスワードを変更する前に一度サインアウトしてもう一度サインインしてください。",
  "auth.errEmailAddressInvalid":
    "そのメールアドレスは受け付けられませんでした。入力ミスがないか確認してください。",
  "auth.errProfileRejected":
    "プロフィールの内容を受け付けられませんでした。ユーザー名：{rules}",

  // 初回のオンボーディング（アプリのレイアウトから表示）。
  "onboarding.title": "プロフィールを設定",
  "onboarding.description":
    "ユーザー名を決めてください。ほかの項目は任意で、後から変更できます。",
  "onboarding.checking": "確認中…",
  "onboarding.available": "使えます",
  "onboarding.skip": "あとで設定する",
  "onboarding.avatarLabel": "アバターのポケモン",

  // 初回ウェルカムフロー（オンボーディング後にレイアウトから表示。
  // すべてのステップはスキップ可能）。
  "welcome.title": "OHKOLabへようこそ",
  "welcome.stepOf": "ステップ {n} / {total}",
  "welcome.profileDescription":
    "よく遊ぶルールとお気に入りのポケモンを選びましょう。どちらも任意です。",
  "welcome.followDescription": "何人かフォローして、フィードを始めましょう。",
  "welcome.joinDescription":
    "グループに参加して、一緒に遊ぶ仲間を見つけましょう。",
  "welcome.next": "次へ",
  "welcome.noSuggestions": "今のおすすめはありません。あとで人を探せます。",
  "welcome.noGroups": "まだ公開グループがありません。あとで作成できます。",

  // アカウントメニューとオンボーディングで表示されるプロフィール項目。
  "profile.usernameLabel": "ユーザー名",
  "profile.displayNameLabel": "表示名",
  "profile.displayNameHint": "任意。{max}文字以内。",
  "profile.favouriteSpecies": "好きなポケモン",
  "profile.mainFormatLabel": "メインフォーマット",
  "profile.mainFormatSingles": "シングル",
  "profile.mainFormatDoubles": "ダブル",
  "profile.mainFormatBoth": "どちらも",
  "profile.savedToast": "プロフィールを保存しました。",
  "profile.accountSection": "アカウント",
  "profile.signedOutToast": "サインアウトしました。",
  "profile.publicPage": "公開ページ",

  // ソーシャル機能のエラー（データ層で変換された失敗）。
  // エラーマップはエントリー側に属するため、ここに置く。
  "social.errors.not_configured": "コミュニティ機能は現在利用できません。",
  "social.errors.not_installed":
    "コミュニティ機能はまだ準備中です。しばらくしてからもう一度お試しください。",
  "social.errors.not_signed_in":
    "サインインしてコミュニティ機能を利用してください。",
  "social.errors.rate_limited":
    "投稿の間隔が短すぎます。少し待ってからもう一度お試しください。",
  "social.errors.suspended": "このアカウントは現在投稿できません。",
  "social.errors.too_long": "長すぎます。短くしてからもう一度お試しください。",
  "social.errors.not_found": "そのコンテンツはすでに存在しません。",
  "social.errors.forbidden": "この操作は行えません。",
  "social.errors.invalid_input": "入力が正しくありません。",
  "social.errors.network":
    "サーバーに接続できませんでした。通信状況を確認してもう一度お試しください。",
  "social.errors.unknown": "問題が発生しました。もう一度お試しください。",

  // 通知ベル（ヘッダー）とリンク先のページ。
  "notifications.title": "通知",
  "notifications.bellAriaUnread": "通知、未読{badge}件",

  // アカウントメニューのグループリンクとページタイトル。
  "groups.homeTitle": "グループ",
  "groups.newTitle": "グループを作成",

  // モデレーションお知らせのタイトル（/moderation/:id のタブ）。
  "moderation.noticeTitle": "モデレーションのお知らせ",

  // 404のタブタイトル。
  "system.notFoundTitle": "ページが見つかりません",

  // タブタイトルとメタディスクリプション（page-title.ts）と
  // 検索パレットのページ名。シェルが所有するためエントリーに入る。
  "pageTitle.appeals": "申し立て",
  "pageTitle.feedback": "フィードバック",
  "pageTitle.reports": "報告",
  "pageTitle.styleguide": "スタイルガイド",
  "pageTitle.signingIn": "サインイン中",
  "pageTitle.resetPassword": "パスワードのリセット",
  "pageTitle.team": "構築",
  "pageTitle.post": "投稿",
  "pageTitle.group": "グループ",
  "pageTitle.deleteAccount": "アカウントの削除",
  "calc.title": "ダメージ計算",
  "teams.title": "構築",
  "teams.description": "Pokémon Championsの構築を作成・保存・分析できます。",
  "meta.title": "環境",
  "seo.homeDescription":
    "Pokémon Championsのダメージ計算・構築作成・コミュニティ。非公式のファンプロジェクトです。",
  "seo.calcDescription":
    "Pokémon Championsのダメージ計算。もちもの・天候・フィールドに対応し、ダブルとシングルの両方で計算できます。",
  "seo.metaDescription":
    "Pokémon Championsの使用率データ：よく使われるポケモン・技・もちもの・ステータス配分。",
  "seo.teamsDescription":
    "OHKOLabでプレイヤーが公開しているPokémon Championsの構築です。",
  "seo.postDescription":
    "OHKOLabのPokémon Championsコミュニティからの投稿です。",
  "seo.profileDescription": "OHKOLabでのプレイヤーの投稿・公開構築・グループ。",
  "seo.groupDescription": "OHKOLabのPokémon Championsグループ。",
  "seo.groupsDescription":
    "OHKOLabのPokémon Championsグループを探して参加できます。",
  "seo.termsDescription": "OHKOLabの利用規約。",
  "seo.privacyDescription": "OHKOLabの個人情報の取り扱いについて。",
  "seo.creditsDescription":
    "OHKOLabで使っているデータソースとライブラリ、そのライセンス。",
  "seo.battlesDescription":
    "ポケモンチャンピオンズの対戦相手をOHKOLabで見つける。募集、申し込み、マッチング。",
  "seo.learnDescription":
    "ポケモンチャンピオンズのダメージ乱数、1発・2発、ステータスポイント（SP）、同速をやさしく解説。",
  "seo.pressDescription":
    "OHKOLabのロゴ、カラー、スクリーンショット、紹介文。記事や動画にご利用ください。",

  // フィードバックダイアログとクラッシュ画面（どちらもアプリの
  // フレームから表示。テレメトリー切り替えの文言はcommunity側）。
  "feedback.kindBug": "バグ",
  "feedback.kindIdea": "アイデア",
  "feedback.kindOther": "その他",
  "feedback.tooShort": "もう少し詳しく教えてください（{min}文字以上）。",
  "feedback.tooLong": "フィードバックは{max}文字以内です。",
  "feedback.sentToast": "ありがとうございます。フィードバックを送信しました。",
  "feedback.rateLimited":
    "最近フィードバックを多数送信しています。1時間ほど経ってからもう一度お送りください。",
  "feedback.description":
    "壊れているもの、足りないもの、見たいものをお聞かせください。すべて目を通しています。",
  "feedback.signedOutBody":
    "サイトからフィードバックを送るにはアカウントが必要です。メールでもご連絡いただけます。",
  "feedback.emailUs": "{email}にメールする",
  "feedback.kindAria": "フィードバックの種類",
  "feedback.placeholder": "何が起きましたか？何を変えるべきですか？",
  "feedback.messageAria": "フィードバック内容",
  "feedback.includeDetails":
    "技術情報を含める（ページ、アプリのバージョン、ブラウザー、画面サイズ",
  "feedback.crashIdSuffix": "、クラッシュID",
  "feedback.send": "送信",
  "feedback.sending": "送信中…",
  "crash.title": "問題が発生しました",
  "crash.body":
    "こちら側で問題が発生しました。データは安全です。ページの再読み込み、フィードへの戻る、または発生したことをお知らせいただければ、より早く修正できます。",
  "crash.referencePrefix": "クラッシュ参照ID:",
  "crash.reload": "再読み込み",
  "crash.goHome": "ホームへ",
  "crash.tellUs": "発生したことを報告する",

  // ダイレクトメッセージ（未リリース、VITE_DIRECT_MESSAGES）。ここにある
  // のはナビラベルのみ。ほかはcommunityドメイン。
  "nav.messages": "メッセージ",

  // 録画モード（?demo=1）。サンプルであることの表示と形式ラベルは、
  // communityとtools両方のルートから描かれるためここに置く。本文と
  // 構術名はそれぞれの機能のドメインに置く。
  "demo.example": "サンプル",
  "demo.formatDoubles": "ダブル",
  "demo.formatSingles": "シングル",
};
