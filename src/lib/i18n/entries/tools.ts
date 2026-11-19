/**
 * The tools dictionary: the damage calculator, the team builder and the
 * metagame section (`calc.*`, `teams.*`, `meta.*`). OWNED BY SUB-AGENT 2 of
 * the Japanese wave — the lead does not edit this file while that stream
 * runs.
 *
 * The Japanese side must keep exactly the same keys as the English side
 * (the parity test enforces it). Community terms: ダブル / シングル,
 * ダメージ計算 for the damage calc, 確定1発 / 乱数1発 for OHKO, and keep "SP"
 * with ステータスポイント on first use.
 */

export const toolsEn = {
  // Damage calculator: page frame and shared controls.
  "calc.title": "Damage calculator",
  "calc.sectionAria": "Calculator section",
  "calc.attacker": "Attacker",
  "calc.defender": "Defender",
  "calc.field": "Field",
  "calc.battleFormat": "Battle format",
  "calc.formatSingles": "Singles",
  "calc.formatDoubles": "Doubles",
  "calc.swapSides": "Swap sides",
  "calc.reset": "Reset",
  "calc.resetToast": "Calculator reset",
  "calc.undo": "Undo",
  "calc.results": "Results",
  "calc.noMovesYet": "No moves yet",
  "calc.noMoves": "No moves",
  "calc.none": "None",

  // Damage calculator: one side's battle state.
  "calc.statBoosts": "Stat boosts",
  "calc.clear": "Clear",
  "calc.status": "Status",
  "calc.currentHp": "Current HP %",
  "calc.megaEvolution": "Mega Evolution",
  "calc.criticalHits": "Critical hits",
  "calc.boostDown": "{side} {stat} boost down",
  "calc.boostUp": "{side} {stat} boost up",
  "calc.statusAria": "{side} status",
  "calc.megaAria": "{side} Mega Evolution",
  "calc.critAria": "{side} {move} critical hit",

  // Damage calculator: the field.
  "calc.weather": "Weather",
  "calc.terrain": "Terrain",
  "calc.doublesOnly": "Doubles only",
  "calc.moreConditions": "More conditions",
  "calc.noConditions": "No conditions",
  "calc.weatherSun": "Sun",
  "calc.weatherRain": "Rain",
  "calc.weatherSand": "Sand",
  "calc.weatherSnow": "Snow",
  "calc.terrainElectric": "Electric",
  "calc.terrainGrassy": "Grassy",
  "calc.terrainPsychic": "Psychic",
  "calc.terrainMisty": "Misty",

  // Damage calculator: results.
  "calc.copy": "Copy",
  "calc.copied": "Copied to clipboard.",
  "calc.categoryPhysical": "Physical",
  "calc.categorySpecial": "Special",
  "calc.categoryStatus": "Status",
  "calc.damageLine": "Damage: {min}-{max} ({minPercent} - {maxPercent}%)",
  "calc.remainingHpLine":
    "Remaining HP: {min}-{max} ({minPercent} - {maxPercent}%)",
  "calc.rolls": "Rolls: {rolls}",
  "calc.damageVaries": "damage varies per hit",
  "calc.criticalHit": " (critical hit)",
  "calc.speedTie": "Speed tie",
  "calc.movesFirst": "{name} moves first",
  "calc.trickRoom": "Trick Room",
  "calc.speedTailwind": "Tailwind",
  "calc.speedParalysis": "paralysis",
  "calc.summaryNotAKo": "Not a KO",
  "calc.summaryNoEffect": "No effect",
  "calc.summaryStatusMove": "Status move",
  "calc.summaryCannotCalc": "Cannot be calculated",

  // Stat labels (translated here; STAT_LABELS in `@/types` stays English).
  "calc.statHp": "HP",
  "calc.statAtk": "Atk",
  "calc.statDef": "Def",
  "calc.statSpa": "SpA",
  "calc.statSpd": "SpD",
  "calc.statSpe": "Spe",

  // Status conditions in the calculator.
  "calc.statusSlp": "Sleep",
  "calc.statusPsn": "Poison",
  "calc.statusBrn": "Burn",
  "calc.statusFrz": "Freeze",
  "calc.statusPar": "Paralysis",
  "calc.statusTox": "Toxic",

  // KO labels, for `KoLabel` (the shared component reads them via the lead).
  "calc.koOhko": "OHKO",
  "calc.ko2hko": "2HKO",
  "calc.koGuaranteed2hko": "GUARANTEED 2HKO",
  "calc.ko3hko": "3HKO",
  "calc.ko4hko": "4HKO",
  "calc.koNoDamage": "No damage",

  // Team builder: the teams list.
  "teams.title": "Teams",
  "teams.description": "Build, save and analyse your Pokémon Champions teams.",
  "teams.retry": "Retry",
  "teams.loadError": "Teams could not be loaded",
  "teams.empty": "No teams yet",
  "teams.emptyDescription":
    "Create one or import a Showdown paste to get started.",
  "teams.newTeam": "New team",
  "teams.open": "Open",
  "teams.duplicate": "Duplicate",
  "teams.duplicateNamed": "Duplicate {name}",
  "teams.deleteNamed": "Delete {name}",
  "teams.undo": "Undo",
  "teams.duplicated": 'Duplicated "{name}".',
  "teams.deleted": 'Deleted "{name}".',
  "teams.cardMeta": "{format} · {count} Pokémon · Edited {date}",

  // Team builder: import and export.
  "teams.import": "Import",
  "teams.importTitle": "Import a team",
  "teams.importDescription":
    "Paste a Pokémon Showdown team export. Up to six Pokémon are imported.",
  "teams.showdownExport": "Showdown export",
  "teams.importTeam": "Import team",
  "teams.importEmptyError": "No importable Pokémon found in that paste.",
  "teams.imported": "Imported {count} Pokémon.",
  "teams.importedWithWarnings":
    "Imported {count} Pokémon ({warningCount} warnings).",
  "teams.export": "Export",
  "teams.exportTeam": "Export team",
  "teams.exportTitle": "Export team",
  "teams.exportDescription": "Copy this Showdown export to share the team.",

  // Team builder: the detail page.
  "teams.loading": "Loading your teams…",
  "teams.loadErrorDescription": "Your teams could not be loaded.",
  "teams.notFound": "Team not found",
  "teams.notFoundDescription": "This team may have been deleted.",
  "teams.backToTeams": "Back to teams",
  "teams.memberCount": "{count} of {max} Pokémon",
  "teams.public": "Public",
  "teams.publicTeam": "Public team",
  "teams.nameLabel": "Team name",
  "teams.rename": "Rename",
  "teams.renameTeam": "Rename team",
  "teams.renameTitle": "Rename team",
  "teams.renameDescription": "Choose a new name for this team.",
  "teams.nameEmpty": "Name cannot be empty.",
  "teams.duplicateTeam": "Duplicate team",
  "teams.deleteTeam": "Delete team",
  "teams.moreActions": "More actions",
  "teams.addPokemon": "Add Pokémon",
  "teams.editPokemon": "Edit Pokémon",
  "teams.editorDescription": "Pick a species, item, moves and stat points.",
  "teams.moveUp": "Move {name} up",
  "teams.moveDown": "Move {name} down",
  "teams.editMember": "Edit {name}",
  "teams.removeMember": "Remove {name}",
  "teams.nameThis": "Name this team",
  "teams.untitled": "Untitled team",

  // Team builder: analysis.
  "teams.analysis": "Team analysis",
  "teams.warningDuplicateSpecies": "Duplicate species",
  "teams.warningDuplicateItem": "Duplicate item",
  "teams.warningSet": "Set problems",
  "teams.defense": "Defense",
  "teams.offense": "Offense",
  "teams.speedTiers": "Speed tiers",
  "teams.noMembers": "No Pokémon on this team yet.",
  "teams.noDamagingMoves": "No damaging moves on this team yet.",
  "teams.heatMapPokemon": "Pokémon",
  "teams.heatMapMoveType": "Move type",

  // Team builder: analysis warnings and weak-spot sentences.
  "teams.warnDuplicateSpecies": "{name} is on the team {count} times.",
  "teams.warnDuplicateItem": "{name} is held by {count} Pokémon.",
  "teams.warnSetProblem": "{name}: {problem}",
  "teams.weakSpot": "{count} Pokémon weak to {type}",
  "teams.weakSpotNoResist": "{count} Pokémon weak to {type}, no resist",

  // Metagame: page frame.
  "meta.title": "Metagame",
  "meta.month": "Month",
  "meta.retry": "Retry",
  "meta.loadError": "Could not load metagame data",
  "meta.loadErrorIndex": "The metagame index could not be loaded.",
  "meta.loadErrorSnapshot": "The snapshot for this month could not be loaded.",
  "meta.emptyTitle": "No data for this format yet",
  "meta.emptyDescription":
    "Usage snapshots appear here once the ladder data is published.",
  "meta.noUsageData": "No usage data",

  // Metagame: the attribution line under the ranking table.
  "meta.ratingCutoff": "rating {rating}+",
  "meta.viaSmogon": "via smogon.com/stats",

  // Metagame: ranking table.
  "meta.battles": "{count} battles",
  "meta.regulation": "Regulation",
  "meta.usageRanking": "Usage ranking",
  "meta.searchPokemon": "Search Pokémon",
  "meta.rank": "Rank",
  "meta.pokemon": "Pokémon",
  "meta.usage": "Usage",
  "meta.noMatches": "No matches",
  "meta.noMatchesDescription": 'No Pokémon match "{query}".',
  "meta.clearSearch": "Clear search",

  // Metagame: the Pokémon detail dialog.
  "meta.noData": "No data.",
  "meta.moves": "Moves",
  "meta.items": "Items",
  "meta.abilities": "Abilities",
  "meta.teammates": "Teammates",
  "meta.spreads": "Spreads",
  "meta.addToTeam": "Add to a team",
  "meta.openInCalc": "Open in calc",
  "meta.setBuildFailed": "Could not build a set from this usage entry.",
  "meta.rankUsage": "Rank #{rank} · {usage} usage",

  // Metagame: speed tiers.
  "meta.speedTiers": "Speed tiers",
  "meta.maxMinSpeed": "Max {max} · Min {min}",
  "meta.noSpreadData": "No spread data.",
  "meta.noTierData": "No speed tier data for this snapshot.",

  // Damage calculator: shared links (share wave).
  "calc.shareLinkInvalid":
    "This calculator link could not be opened, so the calculator was reset.",

  // Damage calculator: the second defender in doubles.
  "calc.secondDefender": "Defender 2",
  "calc.addSecondDefender": "Add second defender",
  "calc.removeSecondDefender": "Remove second defender",
  "calc.remove": "Remove",
  "calc.spreadMove": "Spread move ×{factor}",
  "calc.singleTarget": "Targets one Pokémon per use",
} as const;

export type ToolsKey = keyof typeof toolsEn;
