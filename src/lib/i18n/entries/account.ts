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
