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

  // Accessibility pass (quality wave): the home link and theme switch.
  "nav.homeAria": "OHKOLab home",
  "theme.toLight": "Switch to light theme",
  "theme.toDark": "Switch to dark theme",
} as const;

export type ShellKey = keyof typeof shellEn;
