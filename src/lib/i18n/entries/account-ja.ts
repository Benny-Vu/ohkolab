/**
 * The Japanese half of the Account dictionary. It lives in its own
 * file (and its own chunk) so the entry bundle only carries the English
 * strings; `ja.ts` imports it from the lazily loaded Japanese dictionary.
 * The keys and their English source of truth stay in `account.ts`.
 */
import type { AccountKey } from "@/lib/i18n/entries/account";

export const accountJa: { [K in AccountKey]: string } = {
  // サインイン・サインアップ。
  "login.signUpTab": "サインアップ",
  "login.email": "メールアドレス",
  "login.password": "パスワード",
  "login.forgotPassword": "パスワードをお忘れですか？",
  "login.continueGoogle": "Googleで続ける",
  "login.continueDiscord": "Discordで続ける",
  "login.signedInToast": "サインインしました。",
  "login.accountCreatedToast": "アカウントを作成しました。",
  "login.resetSentToast": "リセット用のリンクをメールで確認してください。",
  "login.acceptTermsError":
    "16歳以上であることと利用規約への同意を確認してアカウントを作成してください。",
  "login.checkEmailTitle": "メールを確認してください",
  "login.confirmAccountTitle": "アカウントの確認",
  "login.confirmAccountPrefix": "確認のリンクを",
  "login.confirmAccountSuffix":
    "に送信しました。リンクを開いてアカウントを確認し、サインアップを完了してください。",
  "login.resetSentTitle": "リセット用リンクを送信しました",
  "login.resetSentPrefix": "アカウントが存在する場合、",
  "login.resetSentSuffix":
    "宛にパスワードリセット用のリンクを送信しました。リンクを開くとリセットページが表示されます。",
  "login.backToSignIn": "サインインに戻る",
  "login.termsPrefix": "私は16歳以上で、",
  "login.termsLink": "利用規約",
  "login.termsJoin": "と",
  "login.privacyLink": "プライバシーポリシー",
  "login.termsSuffix": "に同意します。",
  "login.captchaFailed":
    "セキュリティチェックを読み込めませんでした。接続を確認するか、challenges.cloudflare.com を許可してから、もう一度お試しください。",

  // パスワードリセット。
  "reset.title": "新しいパスワードを設定",
  "reset.description":
    "アカウントのパスワードを設定します。設定後もサインインしたままになります。",
  "reset.newPassword": "新しいパスワード",
  "reset.confirmPassword": "パスワード（確認）",
  "reset.mismatch": "パスワードが一致しません。",
  "reset.updatedToast": "パスワードを更新しました。",
  "reset.update": "パスワードを更新",

  // OAuth・メール確認のリダイレクト。
  "authCallback.finishing": "サインインを完了しています…",
  "authCallback.failedTitle": "サインインを完了できませんでした",
  "authCallback.waitDescription":
    "サインインを完了しています。少々お待ちください。",
  "authCallback.backHome": "ホームに戻る",

  // 未設定のときのお知らせ。
  "unconfigured.title": "アカウント機能は利用できません",

  // プロフィール編集。
  "profile.guestTitle": "ゲストとして閲覧しています",
  "profile.guestDescription":
    "サインインすると構築の保存やプロフィールの保持などができます。",
  "profile.howYouAppear": "他のプレイヤーに表示される情報です。",
  "profile.avatarSpecies": "アバターのポケモン",
  "profile.bioLabel": "プロフィール",
  "profile.bioHint": "任意。{max}文字以内。",
  "profile.lookingForLabel": "探しているもの",
  "profile.lookingForHint": "任意。{max}文字以内。",
  "profile.youtubeLabel": "YouTubeチャンネル",
  "profile.twitchLabel": "Twitchチャンネル",
  "profile.showdownLabel": "Showdownの名前",
  "profile.linksHint": "リンクはhttps://ではじめます。",
  "profile.saveChanges": "変更を保存",
  "profile.reset": "リセット",
  "profile.sessionTitle": "セッション",
  "profile.signOutDescription": "このデバイスからサインアウトします。",
  "profile.privacyTitle": "プライバシー",
  "profile.telemetryTitle": "クラッシュレポートと利用統計",
  "profile.telemetryDescription":
    "問題の発見と修正に役立つ、匿名の・Cookieを使わないテレメトリです。オフにすると両方とも直ちに停止します。",
  "profile.dangerZone": "危険な操作",
  "profile.deleteAccountTitle": "アカウントを削除",
  "profile.deleteAccountDescription":
    "アカウントを削除すると、プロフィールと保存した構築は完全に失われます。この操作は取り消せません。",
  "profile.deleteDialogTitle": "アカウントを削除します",
  "profile.deleteDialogPrefix":
    "アカウント・プロフィール・保存したすべての構築が完全に削除されます。取り消せません。確認のためユーザー名（",
  "profile.deleteDialogSuffix": "）を入力してください。",
  "profile.confirmUsername": "ユーザー名の確認",
  "profile.deleteForever": "完全に削除",
  "profile.deletedToast": "アカウントを削除しました。",
  "profile.loadFailedTitle": "プロフィールを読み込めませんでした",
  "profile.loadFailedBody":
    "プロフィールを読み込めませんでした。更新してもう一度お試しください。",
  "profile.blockedUsersTitle": "ブロックしたユーザー",
  "profile.blockedUsersDescription":
    "ブロックしたトレーナーはフォローできず、あなたの投稿にも関与できません。",
  "profile.noBlocks": "ブロックしたユーザーはいません。",
  "profile.blocksLoadFailed":
    "ブロックしたユーザーを読み込めませんでした。更新してお試しください。",
  "profile.unblock": "ブロック解除",
  "profile.unblockedToast": "@{name}のブロックを解除しました。",

  // プッシュ通知の設定（ネイティブアプリのみ、VITE_PUSH のフラグ付き）。
  "profile.pushSection": "通知",
  "profile.pushMasterTitle": "プッシュ通知",
  "profile.pushMasterDescription":
    "この端末へのプッシュのまとめスイッチです。下のスイッチで、それぞれの内容を選べます。",
  "profile.pushAllLabel": "すべてのプッシュ通知",
  "profile.pushLikes": "いいね",
  "profile.pushComments": "コメント",
  "profile.pushFollows": "フォロー",
  "profile.pushGroups": "グループ",
  "profile.pushMessages": "メッセージ",
  "profile.pushSavedToast": "プッシュ設定を保存しました。",
  "profile.pushFailedToast": "プッシュ設定を保存できませんでした。",
  "publicProfile.unconfiguredTitle": "プロフィール機能は利用できません",
  "publicProfile.unconfiguredBody":
    "このビルドではプロフィール機能は利用できません。",
  "publicProfile.view": "見る",
  "publicProfile.copyToast": "「{name}」を自分の構築にコピーしました。",
  "publicProfile.pokemonCount": "{n}匹",
  "publicProfile.sharedBy": "@{name}が共有",
  "publicProfile.teamsLoadError": "構築を読み込めませんでした",
  "publicProfile.teamsLoadErrorDescription":
    "このプロフィールの構築の読み込み中に問題が発生しました。",
  "publicProfile.noTeams": "公開された構築はまだありません",
  "publicProfile.groupsLoadError": "グループを読み込めませんでした",
  "publicProfile.groupsLoadErrorDescription":
    "このトレーナーのグループの読み込み中に問題が発生しました。通信状況を確認してもう一度お試しください。",
  "publicProfile.noGroups": "グループはまだありません",
  "publicProfile.followers": "フォロワー",
  "publicProfile.noFollowers": "まだフォロワーがいません",
  "publicProfile.following": "フォロー中",
  "publicProfile.notFollowing": "まだ誰もフォローしていません",
  "publicProfile.followersLabel": "フォロワー",
  "publicProfile.followingLabel": "フォロー中",
  "publicProfile.unfollowedToast": "@{name}のフォローを解除しました。",
  "publicProfile.followingToast": "@{name}をフォローしました。",
  "publicProfile.signInToFollow": "フォローするにはサインイン",
  "publicProfile.signInToBlock": "ブロックするにはサインイン",
  "publicProfile.moreOptions": "その他の操作",
  "publicProfile.unfollow": "フォロー解除",
  "publicProfile.follow": "フォロー",
  "publicProfile.blockUser": "ユーザーをブロック",
  "publicProfile.reportUser": "ユーザーを報告",
  "publicProfile.suspendUser": "ユーザーを停止",
  "publicProfile.blockTitle": "@{name}をブロックしますか？",
  "publicProfile.blockDescription":
    "ブロックは双方向に作用します。相手の投稿やプロフィールはあなたに表示されず、あなたの投稿も相手には表示されません。互いにフォローできなくなります。後からアカウントページでブロック解除できます。",
  "publicProfile.block": "ブロック",
  "publicProfile.loadingPostsAria": "投稿を読み込み中",
  "publicProfile.loadingProfileAria": "プロフィールを読み込み中",
  "publicProfile.postsLoadError": "投稿を読み込めませんでした",
  "publicProfile.postsLoadErrorDescription":
    "このトレーナーの投稿の読み込み中に問題が発生しました。通信状況を確認してもう一度お試しください。",
  "publicProfile.noPosts": "投稿はまだありません",
  "publicProfile.metaDescription": "{name}（OHKOLab）",
  "publicProfile.defaultDescription": "トレーナーの公開プロフィール。",
  "publicProfile.profileLoadError": "プロフィールを読み込めませんでした",
  "publicProfile.profileLoadErrorDescription":
    "このプロフィールの読み込み中に問題が発生しました。通信状況を確認してもう一度お試しください。",
  "publicProfile.notFoundTitle": "プロフィールが見つかりません",
  "publicProfile.notFoundDescription": "@{name}というユーザーはいません。",
  "publicProfile.sectionsAria": "プロフィールのセクション",
  "publicProfile.postsTab": "投稿",
  "publicProfile.teamsTab": "構築",
  "publicProfile.groupsTab": "グループ",
  "publicProfile.mainFormatLabel": "メインフォーマット",
  "publicProfile.formatBoth": "シングルとダブル",
  "publicProfile.lookingForLabel": "探しているもの",
  "publicProfile.youtubeLabel": "YouTube",
  "publicProfile.twitchLabel": "Twitch",
  "publicProfile.showdownLabel": "Showdown",
  "publicProfile.unknownTypes": "タイプ不明",
  "publicProfile.noItem": "もちものなし",
  "publicProfile.noMoves": "技なし",
  "publicProfile.followListError": "リストを読み込めませんでした",
};
