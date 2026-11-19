/**
 * The account dictionary: sign-in/sign-up, password reset, the profile
 * editor and the public profile page. Owned by the lead; the Japanese side
 * must keep exactly the same keys (the parity test enforces it). The
 * `auth.*` validation and error messages live in the shell dictionary (the
 * auth modules sit in the entry graph), and their values must match what
 * `t()` returns for English exactly, because lib tests assert them.
 */

export const accountEn = {
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
    "Confirm that you are 16 or older and accept the terms to create an account.",
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
  "login.termsPrefix": "I am 16 or older and accept the",
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

  // The profile editor.
  "profile.guestTitle": "You are browsing as a guest",
  "profile.guestDescription":
    "Sign in to save teams, keep your profile and more.",
  "profile.howYouAppear": "How you appear to other players.",
  "profile.avatarSpecies": "Avatar species",
  "profile.bioLabel": "Bio",
  "profile.bioHint": "Optional. At most {max} characters.",
  "profile.favouriteHint": "Shown on your public profile.",
  "profile.lookingForLabel": "Looking for",
  "profile.lookingForHint": "Optional. At most {max} characters.",
  "profile.youtubeLabel": "YouTube channel",
  "profile.twitchLabel": "Twitch channel",
  "profile.showdownLabel": "Showdown name",
  "profile.linksHint": "Links start with https://.",
  "profile.saveChanges": "Save changes",
  "profile.reset": "Reset",
  "profile.sessionTitle": "Session",
  "profile.signOutDescription": "Sign out on this device.",
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

  // Push notification settings (native app only, behind VITE_PUSH).
  "profile.pushSection": "Notifications",
  "profile.pushMasterTitle": "Push notifications",
  "profile.pushMasterDescription":
    "The master switch for pushes to this device. The switches below choose what each push is about.",
  "profile.pushAllLabel": "All push notifications",
  "profile.pushLikes": "Likes",
  "profile.pushComments": "Comments",
  "profile.pushFollows": "Follows",
  "profile.pushGroups": "Groups",
  "profile.pushMessages": "Messages",
  "profile.pushSavedToast": "Push settings saved.",
  "profile.pushFailedToast": "Push settings could not be saved.",
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
  "publicProfile.loadingProfileAria": "Loading profile",
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
  "publicProfile.favouriteLabel": "Favourite Pokémon",
  "publicProfile.mainFormatLabel": "Main format",
  "publicProfile.formatBoth": "Singles and doubles",
  "publicProfile.lookingForLabel": "Looking for",
  "publicProfile.youtubeLabel": "YouTube",
  "publicProfile.twitchLabel": "Twitch",
  "publicProfile.showdownLabel": "Showdown",
  "publicProfile.unknownTypes": "Unknown types",
  "publicProfile.noItem": "No item",
  "publicProfile.noMoves": "No moves",
  "publicProfile.followListError": "Could not load this list",
} as const;
export type AccountKey = keyof typeof accountEn;
