/**
 * The account dictionary: sign-in/sign-up, password reset, onboarding, the
 * profile editor, and the auth validation and error messages. Owned by the
 * lead; the Japanese side must keep exactly the same keys (the parity test
 * enforces it). The `auth.*` message values must match what `t()` returns
 * for English exactly, because lib tests assert the English strings.
 */

export const accountEn = {
  // Validation messages (src/lib/auth/validation.ts).
  "auth.usernameRules":
    "3 to 20 characters: lowercase letters, digits and underscores.",
  "auth.errUsernameChoose": "Choose a username.",
  "auth.errUsernameNew": "Choose a new username.",
  "auth.errUsernameMin": "Username must be at least {min} characters.",
  "auth.errUsernameMax": "Username must be at most {max} characters.",
  "auth.errUsernamePattern":
    "Username can only contain lowercase letters, digits and underscores.",
  "auth.errDisplayNameMax": "Display name must be at most {max} characters.",
  "auth.errBioMax": "Bio must be at most {max} characters.",
  "auth.errAvatarSpecies": "That Pokémon cannot be used as an avatar.",
  "auth.errEmailEmpty": "Enter your email address.",
  "auth.errEmailInvalid": "Enter a valid email address.",
  "auth.errPasswordEmpty": "Enter your password.",
  "auth.errPasswordChoose": "Choose a password.",
  "auth.errPasswordMin": "Password must be at least {min} characters.",
  "auth.errPasswordMax": "Password must be at most {max} characters.",

  // Auth error messages (src/lib/auth/errors.ts), keyed by error code.
  "auth.errNotConfigured":
    "Accounts are not available in this build. The tools still work without one.",
  "auth.errUnavailable": "Accounts are not fully set up yet. Try again later.",
  "auth.errInvalidInput":
    "Some of those details were not accepted. Check them and try again.",
  "auth.errInvalidCredentials": "Wrong email or password.",
  "auth.errEmailNotConfirmed":
    "Confirm your email address first: open the link we sent you, then sign in.",
  "auth.errEmailTaken":
    "An account with this email may already exist. Try signing in, or reset your password.",
  "auth.errWeakPassword":
    "That password is too easy to guess. Choose a stronger one.",
  "auth.errRateLimited": "Too many attempts. Wait a minute and try again.",
  "auth.errProviderUnavailable": "This sign-in method is not available yet.",
  "auth.errUsernameTaken": "That username is already taken. Try another one.",
  "auth.errSessionExpired": "Your session has expired. Sign in again.",
  "auth.errLinkInvalid":
    "This link is no longer valid. It may have expired, been used already, or been opened in a different browser from the one you started in. Request a new one.",
  "auth.errForbidden": "You are not allowed to do that.",
  "auth.errNetwork":
    "Could not reach the server. Check your connection and try again.",
  "auth.errUnknown": "Something went wrong. Try again.",
  "auth.errSamePassword":
    "The new password must be different from the current one.",
  "auth.errSignupDisabled": "New sign-ups are closed right now.",
  "auth.errReauth":
    "For your security, sign out and sign in again before changing your password.",
  "auth.errEmailAddressInvalid":
    "That email address was not accepted. Check it for typos.",
  "auth.errProfileRejected":
    "Those profile details were not accepted. Username: {rules}",

  // Sign-in / sign-up.
  "login.signUpTab": "Sign up",
  "login.email": "Email",
  "login.password": "Password",
  "login.forgotPassword": "Forgot password?",
  "login.continueGoogle": "Continue with Google",
  "login.continueDiscord": "Continue with Discord",
  "login.signedInToast": "Signed in.",
  "login.accountCreatedToast": "Account created.",
  "login.resetSentToast": "Check your email for the reset link.",
  "login.acceptTermsError":
    "Confirm that you are 13 or older and accept the terms to create an account.",
  "login.checkEmailTitle": "Check your email",
  "login.confirmAccountTitle": "Confirm your account",
  "login.confirmAccountPrefix": "We sent a link to",
  "login.confirmAccountSuffix":
    ". Open it to confirm your account and finish signing up.",
  "login.resetSentTitle": "Reset link sent",
  "login.resetSentPrefix": "If an account exists for",
  "login.resetSentSuffix":
    ", a password reset link is on its way. The link opens the reset page.",
  "login.backToSignIn": "Back to sign in",
  "login.termsPrefix": "I am 13 or older and accept the",
  "login.termsLink": "terms",
  "login.termsJoin": "and",
  "login.privacyLink": "privacy policy",
  "login.termsSuffix": "",

  // Password reset.
  "reset.title": "Choose a new password",
  "reset.description":
    "This sets the password for your account. You stay signed in afterwards.",
  "reset.newPassword": "New password",
  "reset.confirmPassword": "Confirm password",
  "reset.mismatch": "Passwords do not match.",
  "reset.updatedToast": "Password updated.",
  "reset.update": "Update password",

  // OAuth / email-confirmation redirect.
  "authCallback.finishing": "Finishing sign-in…",
  "authCallback.failedTitle": "Sign-in could not be completed",
  "authCallback.waitDescription": "One moment while your sign-in is completed.",
  "authCallback.backHome": "Back to home",

  // The not-configured notice.
  "unconfigured.title": "Accounts are unavailable",

  // First-run onboarding.
  "onboarding.title": "Set up your profile",
  "onboarding.description":
    "Choose a username. The rest is optional and can change later.",
  "onboarding.checking": "Checking…",
  "onboarding.available": "Available",
  "onboarding.skip": "Skip for now",
  "onboarding.avatarLabel": "Avatar Pokémon",

  // The profile editor.
  "profile.guestTitle": "You are browsing as a guest",
  "profile.guestDescription":
    "Sign in to save teams, keep your profile and more.",
  "profile.howYouAppear": "How you appear to other players.",
  "profile.avatarSpecies": "Avatar species",
  "profile.usernameLabel": "Username",
  "profile.displayNameLabel": "Display name",
  "profile.displayNameHint": "Optional. At most {max} characters.",
  "profile.bioLabel": "Bio",
  "profile.bioHint": "Optional. At most {max} characters.",
  "profile.saveChanges": "Save changes",
  "profile.savedToast": "Profile saved.",
  "profile.reset": "Reset",
  "profile.accountSection": "Account",
  "profile.sessionTitle": "Session",
  "profile.signOutDescription": "Sign out on this device.",
  "profile.signedOutToast": "Signed out.",
  "profile.privacyTitle": "Privacy",
  "profile.telemetryTitle": "Crash reports and usage statistics",
  "profile.telemetryDescription":
    "Anonymous, cookieless telemetry that helps us find and fix problems. Turning it off stops both immediately.",
  "profile.dangerZone": "Danger zone",
  "profile.deleteAccountTitle": "Delete account",
  "profile.deleteAccountDescription":
    "Deleting your account removes your profile and saved teams forever. This cannot be undone.",
  "profile.deleteDialogTitle": "Delete your account",
  "profile.deleteDialogPrefix":
    "This permanently deletes your account, your profile and all your saved teams. There is no undo. Type your username (",
  "profile.deleteDialogSuffix": ") to confirm.",
  "profile.confirmUsername": "Confirm username",
  "profile.deleteForever": "Delete forever",
  "profile.deletedToast": "Account deleted.",
  "profile.publicPage": "Public page",
  "profile.loadFailedTitle": "Profile could not be loaded",
  "profile.loadFailedBody": "Your profile could not be loaded. Try refreshing.",
  "profile.blockedUsersTitle": "Blocked users",
  "profile.blockedUsersDescription":
    "Blocked trainers cannot follow you or interact with your posts.",
  "profile.noBlocks": "You haven't blocked anyone.",
  "profile.blocksLoadFailed":
    "Blocked users could not be loaded. Try refreshing.",
  "profile.unblock": "Unblock",
  "profile.unblockedToast": "Unblocked @{name}.",
  "publicProfile.unconfiguredTitle": "Profiles are unavailable",
  "publicProfile.unconfiguredBody": "Profiles are not available in this build.",
  "publicProfile.view": "View",
  "publicProfile.copyToast": 'Copied "{name}" to your teams.',
  "publicProfile.pokemonCount": "{n} Pokémon",
  "publicProfile.sharedBy": "shared by @{name}",
  "publicProfile.teamsLoadError": "Could not load teams",
  "publicProfile.teamsLoadErrorDescription":
    "Something went wrong while loading this profile's teams.",
  "publicProfile.noTeams": "No public teams yet",
  "publicProfile.groupsLoadError": "Could not load groups",
  "publicProfile.groupsLoadErrorDescription":
    "Something went wrong while loading this trainer's groups. Check your connection and try again.",
  "publicProfile.noGroups": "No groups yet",
  "publicProfile.followers": "Followers",
  "publicProfile.noFollowers": "No followers yet",
  "publicProfile.following": "Following",
  "publicProfile.notFollowing": "Not following anyone yet",
  "publicProfile.followersLabel": "followers",
  "publicProfile.followingLabel": "following",
  "publicProfile.unfollowedToast": "Unfollowed @{name}.",
  "publicProfile.followingToast": "Following @{name}.",
  "publicProfile.signInToFollow": "Sign in to follow",
  "publicProfile.signInToBlock": "Sign in to block",
  "publicProfile.moreOptions": "More options",
  "publicProfile.unfollow": "Unfollow",
  "publicProfile.follow": "Follow",
  "publicProfile.blockUser": "Block user",
  "publicProfile.reportUser": "Report user",
  "publicProfile.suspendUser": "Suspend user",
  "publicProfile.blockTitle": "Block @{name}?",
  "publicProfile.blockDescription":
    "Blocking works both ways: you won't see their posts or profile, they won't see yours, and neither of you can follow the other. You can unblock them later from your account page.",
  "publicProfile.block": "Block",
  "publicProfile.loadingPostsAria": "Loading posts",
  "publicProfile.postsLoadError": "Could not load posts",
  "publicProfile.postsLoadErrorDescription":
    "Something went wrong while loading this trainer's posts. Check your connection and try again.",
  "publicProfile.noPosts": "No posts yet",
  "publicProfile.metaDescription": "{name} on OHKOLab",
  "publicProfile.defaultDescription": "A trainer's public profile.",
  "publicProfile.profileLoadError": "Could not load profile",
  "publicProfile.profileLoadErrorDescription":
    "Something went wrong while loading this profile. Check your connection and try again.",
  "publicProfile.notFoundTitle": "Profile not found",
  "publicProfile.notFoundDescription": "No one goes by @{name} here.",
  "publicProfile.sectionsAria": "Profile sections",
  "publicProfile.postsTab": "Posts",
  "publicProfile.teamsTab": "Teams",
  "publicProfile.groupsTab": "Groups",
  "publicProfile.unknownTypes": "Unknown types",
  "publicProfile.noItem": "No item",
  "publicProfile.noMoves": "No moves",
  "publicProfile.followListError": "Could not load this list",
} as const;
export type AccountKey = keyof typeof accountEn;

export const accountJa: { [K in AccountKey]: string } = {
  // バリデーションメッセージ（src/lib/auth/validation.ts）。
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
    "13歳以上であることと利用規約への同意を確認してアカウントを作成してください。",
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
  "login.termsPrefix": "私は13歳以上で、",
  "login.termsLink": "利用規約",
  "login.termsJoin": "と",
  "login.privacyLink": "プライバシーポリシー",
  "login.termsSuffix": "に同意します。",

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

  // 初回のオンボーディング。
  "onboarding.title": "プロフィールを設定",
  "onboarding.description":
    "ユーザー名を決めてください。ほかの項目は任意で、後から変更できます。",
  "onboarding.checking": "確認中…",
  "onboarding.available": "使えます",
  "onboarding.skip": "あとで設定する",
  "onboarding.avatarLabel": "アバターのポケモン",

  // プロフィール編集。
  "profile.guestTitle": "ゲストとして閲覧しています",
  "profile.guestDescription":
    "サインインすると構築の保存やプロフィールの保持などができます。",
  "profile.howYouAppear": "他のプレイヤーに表示される情報です。",
  "profile.avatarSpecies": "アバターのポケモン",
  "profile.usernameLabel": "ユーザー名",
  "profile.displayNameLabel": "表示名",
  "profile.displayNameHint": "任意。{max}文字以内。",
  "profile.bioLabel": "プロフィール",
  "profile.bioHint": "任意。{max}文字以内。",
  "profile.saveChanges": "変更を保存",
  "profile.savedToast": "プロフィールを保存しました。",
  "profile.reset": "リセット",
  "profile.accountSection": "アカウント",
  "profile.sessionTitle": "セッション",
  "profile.signOutDescription": "このデバイスからサインアウトします。",
  "profile.signedOutToast": "サインアウトしました。",
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
  "profile.publicPage": "公開ページ",
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
  "publicProfile.unknownTypes": "タイプ不明",
  "publicProfile.noItem": "もちものなし",
  "publicProfile.noMoves": "技なし",
  "publicProfile.followListError": "リストを読み込めませんでした",
};
