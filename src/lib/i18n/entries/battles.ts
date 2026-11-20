/**
 * The battles dictionary: the battle board, the create form, the offers and
 * the matched exchange. Owned by the battles wave; the Japanese side must
 * keep exactly the same keys (the parity test enforces it).
 */

export const battlesEn = {
  // The board's own frame (the nav entry and the page title).
  "battles.title": "Battles",
  // Battle board
  "battles.description": "Find an opponent for a Champions match.",
  "battles.newRequest": "New battle request",
  "battles.filterFormatAria": "Format filter",
  "battles.filterLanguageAria": "Language filter",
  "battles.formatAll": "All",
  "battles.formatSingles": "Singles",
  "battles.formatDoubles": "Doubles",
  "battles.languageAll": "All",
  "battles.startingSoon": "Starting soon",
  "battles.loadingAria": "Loading battle requests",
  "battles.loadError": "Could not load battle requests.",
  "battles.emptyTitle": "No open battle requests.",
  "battles.emptyDescription": "Be the first to look for an opponent.",
  "battles.noMatches": "No battle requests match these filters.",
  "battles.signInToBattle": "Sign in to find an opponent.",
  "battles.offer": "Offer to battle",
  "battles.offered": "Offer sent",
  "battles.report": "Report",
  "battles.reportTitle": "Report battle request",
  "battles.reportDescription":
    "Tell our moderators what is wrong with this battle request.",
  "battles.reportReasonLabel": "Reason",
  "battles.errorTooManyOpen":
    "Too many open battle requests. Close one first, or wait for a match.",
  "battles.errorOfferCap": "Daily offer limit reached. Try again tomorrow.",
  "battles.errorAlreadyOffered": "You already offered on this request.",
  "battles.errorGeneric": "Something went wrong. Try again.",
  "battles.startsAt": "Starts {time} (your time)",
  "battles.window": "{start} – {end} (your time)",
  "battles.until": "Until {time} (your time)",
  "battles.unknownAuthor": "Unknown player",
  "battles.createDescription": "Describe the match you want.",
  "battles.formatLabel": "Format",
  "battles.rulesLabel": "Rules",
  "battles.rulesPlaceholder": "Reg M-C, best of 3",
  "battles.rulesRequired": "Write the rules for this match.",
  "battles.rulesTooLong": "Keep the rules within 80 characters.",
  "battles.quickPicksLabel": "Quick picks",
  "battles.chipRegMC": "Reg M-C",
  "battles.chipBestOf3": "best of 3",
  "battles.chipCasual": "casual",
  "battles.noteLabel": "Note (optional)",
  "battles.notePlaceholder": "Anything else your opponent should know.",
  "battles.noteTooLong": "Keep the note within 300 characters.",
  "battles.windowLabel": "Time window (optional)",
  "battles.startsAtLabel": "Starts",
  "battles.endsAtLabel": "Ends",
  "battles.windowOrder": "The end time must come after the start time.",
  "battles.languageLabel": "Language",
  "battles.teamLabel": "Team (optional)",
  "battles.noTeam": "No team",
  "battles.teamPickerAria": "Attach a team",
  "battles.create": "Post request",
  "battles.createdToast": "Battle request posted.",
  // Demo mode sample requests (recording mode only, render-only).
  "demo.battle1Rules": "Reg M-C, best of 3",
  "demo.battle1Note": "Looking for a close series.",
  "demo.battle2Rules": "Doubles, casual",
  "demo.battle2Note": "Testing a rain team.",
  "demo.battle3Rules": "Singles, no legendaries",
} as const;

export type BattlesKey = keyof typeof battlesEn;
