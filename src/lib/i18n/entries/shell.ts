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
  "nav.more": "More",
  "nav.notes": "Notes",
  // The battle board's nav label lives here (not the battles domain),
  // because nav-items.ts and the page titles are part of the entry graph.
  "nav.battles": "Battles",
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
  "footer.learn": "Learn",
  "footer.whatsNew": "What's new",
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",
  "footer.credits": "Credits",
  "footer.press": "Press kit",
  "footer.sendFeedback": "Send feedback",
  "footer.madeBy": "OHKOLab is made by",

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
  "common.backToHome": "Back to home",

  // Birth date (asked once; behind VITE_DIRECT_MESSAGES).
  "birthDate.label": "Birth date",
  "birthDate.hint":
    "Used to keep young players safe. Never shown to other players.",
  "birthDate.invalid": "Enter a valid date.",
  "birthDate.tooYoung": "You must be at least 16 years old.",
  "birthDate.saved": "Birth date saved.",
  "birthDate.saveFailed": "Could not save your birth date. Try again.",
  "birthDate.none": "Not added yet.",
  "birthDate.promptTitle": "Add your birth date",
  "birthDate.promptBody":
    "It keeps young players safe and is never shown to other players. Until you add it, you can only message friends.",
  "birthDate.later": "Later",
  "common.close": "Close",
  "common.search": "Search",
  "common.noResults": "No results",
  "common.signIn": "Sign in",
  "common.signUp": "Sign up",
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
  "pokemonEditor.noHeldItem": "No item",
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
  "search.paletteTitle": "Search",
  "search.paletteDescription": "Search Pokémon, moves, items and pages.",
  "search.pages": "Pages",
  "search.pokemon": "Pokémon",
  "search.moves": "Moves",
  "search.items": "Items",

  // The offline notice in the native apps (web never shows it).
  "shell.offlineNotice": "You're offline. Some content may not load.",

  // Accessibility pass (quality wave): the home link and theme switch.
  "nav.homeAria": "OHKOLab home",
  "theme.toLight": "Switch to light theme",
  "theme.toDark": "Switch to dark theme",

  // Auth validation messages (src/lib/auth/validation.ts). These live in the
  // shell because the entry graph renders them (the onboarding dialog and
  // the auth provider are part of the app frame).
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
  "auth.errLookingForMax": "Keep it at most {max} characters.",
  "auth.errShowdownMax": "Showdown names are at most {max} characters.",
  "auth.errProfileUrl": "Links must be https:// addresses.",
  "auth.errEmailEmpty": "Enter your email address.",
  "auth.errEmailInvalid": "Enter a valid email address.",
  "auth.errPasswordEmpty": "Enter your password.",
  "auth.errPasswordChoose": "Choose a password.",
  "auth.errPasswordMin": "Password must be at least {min} characters.",
  "auth.errPasswordMax": "Password must be at most {max} characters.",

  // Auth error messages (src/lib/auth/errors.ts), keyed by error code. The
  // values must match what `t()` returns for English exactly, because lib
  // tests assert the English strings.
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

  // First-run onboarding (the dialog mounts from the app layout).
  "onboarding.title": "Set up your profile",
  "onboarding.description":
    "Choose a username. The rest is optional and can change later.",
  "onboarding.checking": "Checking…",
  "onboarding.available": "Available",
  "onboarding.skip": "Skip for now",
  "onboarding.avatarLabel": "Avatar Pokémon",

  // The three-step welcome flow (mounted from the app layout after
  // onboarding; every step is skippable).
  "welcome.title": "Welcome to OHKOLab",
  "welcome.stepOf": "Step {n} of {total}",
  "welcome.profileDescription": "Pick your main format — it's optional.",
  "welcome.followDescription": "Follow a few people to get your feed started.",
  "welcome.joinDescription": "Join a group to meet people to play with.",
  "welcome.next": "Next",
  "welcome.noSuggestions":
    "No suggestions right now — you can find people later.",
  "welcome.noGroups": "No public groups yet — you can start one later.",

  // Profile bits the account menu and the onboarding dialog render.
  "profile.usernameLabel": "Username",
  "profile.displayNameLabel": "Display name",
  "profile.displayNameHint": "Optional. At most {max} characters.",
  "profile.mainFormatLabel": "Main format",
  "profile.mainFormatSingles": "Singles",
  "profile.mainFormatDoubles": "Doubles",
  "profile.mainFormatBoth": "Both",
  "profile.notSet": "Not set",
  "profile.savedToast": "Profile saved.",
  "profile.accountSection": "Account",
  "profile.signedOutToast": "Signed out.",
  "profile.publicPage": "Public page",

  // Social data-layer errors (mapped Postgres/API failures). The error map
  // is part of the entry graph, so its strings must not lag behind it.
  "social.errors.not_configured":
    "The community feed is not available right now.",
  "social.errors.not_installed":
    "The community feed is not set up yet. Try again later.",
  "social.errors.not_signed_in": "Sign in to use the community feed.",
  "social.errors.rate_limited":
    "You are posting too quickly. Wait a few minutes and try again.",
  "social.errors.suspended": "This account cannot post right now.",
  "social.errors.too_long": "That is too long. Shorten it and try again.",
  "social.errors.not_found": "That is no longer available.",
  "social.errors.forbidden": "You cannot do that.",
  "social.errors.invalid_input": "That input is not valid.",
  "social.errors.network":
    "Could not reach the server. Check your connection and try again.",
  "social.errors.unknown": "Something went wrong. Try again.",

  // The notifications bell (header) and the page it links to.
  "notifications.title": "Notifications",
  "notifications.bellAriaUnread": "Notifications, {badge} unread",

  // Groups links in the account menu and the group page titles.
  "groups.homeTitle": "Groups",
  "groups.newTitle": "Create a group",

  // The moderation notice title (the browser tab of /moderation/:id).
  "moderation.noticeTitle": "Moderation notice",

  // The 404 tab title.
  "system.notFoundTitle": "Page not found",

  // Browser tab titles and meta descriptions (page-title.ts) plus the page
  // names in the search palette: the shell owns the tags and the palette,
  // so their strings must be in the entry bundle.
  "pageTitle.appeals": "Appeals",
  "pageTitle.feedback": "Feedback",
  "pageTitle.reports": "Reports",
  "pageTitle.styleguide": "Styleguide",
  "pageTitle.signingIn": "Signing in",
  "pageTitle.resetPassword": "Reset password",
  "pageTitle.team": "Team",
  "pageTitle.post": "Post",
  "pageTitle.group": "Group",
  "pageTitle.deleteAccount": "Delete your account",
  "calc.title": "Damage calculator",
  "teams.title": "Teams",
  "teams.description": "Build, save and analyse your Pokémon Champions teams.",
  "meta.title": "Metagame",
  "seo.homeDescription":
    "Damage calculator, team builder and community for Pokémon Champions. Unofficial fan project.",
  "seo.calcDescription":
    "Calculate damage between Pokémon Champions sets, with items, weather, terrains and Doubles and Singles support.",
  "seo.metaDescription":
    "Pokémon Champions usage statistics: the most used Pokémon, moves, items and spreads.",
  "seo.teamsDescription": "A Pokémon Champions team shared on OHKOLab.",
  "seo.postDescription": "A post from the OHKOLab Pokémon Champions community.",
  "seo.profileDescription":
    "A player's posts, shared teams and groups on OHKOLab.",
  "seo.groupDescription": "A Pokémon Champions group on OHKOLab.",
  "seo.groupsDescription":
    "Browse and join Pokémon Champions groups on OHKOLab.",
  "seo.termsDescription": "The terms of use for OHKOLab.",
  "seo.privacyDescription": "How OHKOLab handles your data and privacy.",
  "seo.creditsDescription":
    "The data sources and libraries OHKOLab is built on, and their licences.",
  "seo.battlesDescription":
    "Find an opponent for a Pokémon Champions battle: open requests, offers and matches on OHKOLab.",
  "seo.learnDescription":
    "Plain-language guides to Pokémon Champions damage rolls, OHKO and 2HKO, Stat Points and Speed ties.",
  "seo.changelogDescription":
    "What's new on OHKOLab: the latest releases and improvements, newest first.",
  "seo.pressDescription":
    "OHKOLab logos, colours, screenshots and press copy for writers and creators.",

  // The feedback dialog and the crash screen (both mount from the app
  // frame; the telemetry switch strings stay with the community domain).
  "feedback.kindBug": "Bug",
  "feedback.kindIdea": "Idea",
  "feedback.kindOther": "Other",
  "feedback.tooShort": "Tell us a bit more (at least {min} characters).",
  "feedback.tooLong": "Feedback is limited to {max} characters.",
  "feedback.sentToast": "Thanks. Your feedback was sent.",
  "feedback.rateLimited":
    "You have sent a lot of feedback recently. Please try again in an hour.",
  "feedback.description":
    "Tell us what is broken, what is missing, or what you would like to see. We read everything.",
  "feedback.signedOutBody":
    "You need an account to send feedback through the site. You can also email us and we will get back to you.",
  "feedback.emailUs": "Email {email}",
  "feedback.kindAria": "Feedback kind",
  "feedback.placeholder": "What happened? What should we change?",
  "feedback.messageAria": "Your feedback",
  "feedback.includeDetails":
    "Include technical details (page, app version, browser, screen size",
  "feedback.crashIdSuffix": ", crash id",
  "feedback.send": "Send",
  "feedback.sending": "Sending...",
  "crash.title": "Something went wrong",
  "crash.body":
    "Something broke on our side. Your data is safe. You can reload the page, go back to the feed, or tell us what happened so we can fix it faster.",
  "crash.referencePrefix": "Crash reference:",
  "crash.reload": "Reload",
  "crash.goHome": "Go home",
  "crash.tellUs": "Tell us what happened",

  // Direct messages (built but not launched; VITE_DIRECT_MESSAGES). Only
  // the nav label lives here, because nav-items.ts is part of the entry
  // graph. Everything else sits in the community domain.
  "nav.messages": "Messages",

  // Recording mode (?demo=1). The sample-content tag and format labels
  // sit in the shell because demo cards render from both the community
  // and tools routes; the sample bodies and team names sit with their
  // owning feature.
  "demo.example": "Example",
  "demo.formatDoubles": "Doubles",
  "demo.formatSingles": "Singles",
} as const;

export type ShellKey = keyof typeof shellEn;
