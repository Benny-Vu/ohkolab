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
} as const;

export type ToolsKey = keyof typeof toolsEn;

export const toolsJa: { [K in ToolsKey]: string } = {
  // ダメージ計算：ページと共通コントロール。
  "calc.title": "ダメージ計算",
  "calc.sectionAria": "計算機のセクション",
  "calc.attacker": "攻撃側",
  "calc.defender": "防御側",
  "calc.field": "フィールド",
  "calc.battleFormat": "バトル形式",
  "calc.formatSingles": "シングル",
  "calc.formatDoubles": "ダブル",
  "calc.swapSides": "攻守入れ替え",
  "calc.reset": "リセット",
  "calc.resetToast": "計算機をリセットしました",
  "calc.undo": "元に戻す",
  "calc.results": "計算結果",
  "calc.noMovesYet": "まだ技がありません",
  "calc.noMoves": "技なし",
  "calc.none": "なし",

  // ダメージ計算：片側のバトル状態。
  "calc.statBoosts": "ランク補正",
  "calc.clear": "クリア",
  "calc.status": "状態異常",
  "calc.currentHp": "現在のHP%",
  "calc.megaEvolution": "メガシンカ",
  "calc.criticalHits": "急所",
  "calc.boostDown": "{side}の{stat}ランクダウン",
  "calc.boostUp": "{side}の{stat}ランクアップ",
  "calc.statusAria": "{side}の状態異常",
  "calc.megaAria": "{side}のメガシンカ",
  "calc.critAria": "{side}の{move}の急所",

  // ダメージ計算：フィールド。
  "calc.weather": "天候",
  "calc.terrain": "フィールド",
  "calc.doublesOnly": "ダブル専用",
  "calc.moreConditions": "その他の条件",
  "calc.noConditions": "条件なし",
  "calc.weatherSun": "晴れ",
  "calc.weatherRain": "雨",
  "calc.weatherSand": "砂嵐",
  "calc.weatherSnow": "雪",
  "calc.terrainElectric": "エレキフィールド",
  "calc.terrainGrassy": "グラスフィールド",
  "calc.terrainPsychic": "サイコフィールド",
  "calc.terrainMisty": "ミストフィールド",

  // ダメージ計算：計算結果。
  "calc.copy": "コピー",
  "calc.copied": "クリップボードにコピーしました。",
  "calc.categoryPhysical": "物理",
  "calc.categorySpecial": "特殊",
  "calc.categoryStatus": "変化",
  "calc.damageLine": "ダメージ：{min}〜{max}（{minPercent}〜{maxPercent}%）",
  "calc.remainingHpLine": "残りHP：{min}〜{max}（{minPercent}〜{maxPercent}%）",
  "calc.rolls": "乱数：{rolls}",
  "calc.damageVaries": "ダメージは毎回変わります",
  "calc.criticalHit": "（急所）",
  "calc.speedTie": "同速",
  "calc.movesFirst": "{name}が先に動きます",
  "calc.summaryNotAKo": "倒せません",
  "calc.summaryNoEffect": "効果なし",
  "calc.summaryStatusMove": "変化技",
  "calc.summaryCannotCalc": "計算できません",

  // ステータス名（@/typesのSTAT_LABELSは英語のまま）。
  "calc.statHp": "HP",
  "calc.statAtk": "攻撃",
  "calc.statDef": "防御",
  "calc.statSpa": "特攻",
  "calc.statSpd": "特防",
  "calc.statSpe": "素早",

  // 状態異常。
  "calc.statusSlp": "ねむり",
  "calc.statusPsn": "どく",
  "calc.statusBrn": "やけど",
  "calc.statusFrz": "こおり",
  "calc.statusPar": "まひ",
  "calc.statusTox": "もうどく",

  // KOラベル（共通KoLabelコンポーネント用。リードが接続する）。
  "calc.koOhko": "確定1発",
  "calc.ko2hko": "乱数2発",
  "calc.koGuaranteed2hko": "確定2発",
  "calc.ko3hko": "乱数3発",
  "calc.ko4hko": "乱数4発",
  "calc.koNoDamage": "ダメージなし",

  // 構築：一覧。
  "teams.title": "構築",
  "teams.description": "Pokémon Championsの構築を作成・保存・分析できます。",
  "teams.retry": "再試行",
  "teams.loadError": "構築を読み込めませんでした",
  "teams.empty": "構築がまだありません",
  "teams.emptyDescription":
    "新規作成するか、Showdownのテキストをインポートして始めましょう。",
  "teams.newTeam": "新規構築",
  "teams.open": "開く",
  "teams.duplicate": "複製",
  "teams.duplicateNamed": "{name}を複製",
  "teams.deleteNamed": "{name}を削除",
  "teams.undo": "元に戻す",
  "teams.duplicated": "「{name}」を複製しました。",
  "teams.deleted": "「{name}」を削除しました。",
  "teams.cardMeta": "{format} · {count}体 · {date}に編集",

  // 構築：インポートとエクスポート。
  "teams.import": "インポート",
  "teams.importTitle": "構築をインポート",
  "teams.importDescription":
    "Pokémon Showdownの構築テキストを貼り付けてください。最大6匹までインポートされます。",
  "teams.showdownExport": "Showdownテキスト",
  "teams.importTeam": "インポート",
  "teams.importEmptyError": "インポートできるポケモンが見つかりませんでした。",
  "teams.imported": "{count}匹のポケモンをインポートしました。",
  "teams.importedWithWarnings":
    "{count}匹のポケモンをインポートしました（警告{warningCount}件）。",
  "teams.export": "エクスポート",
  "teams.exportTeam": "構築をエクスポート",
  "teams.exportTitle": "構築をエクスポート",
  "teams.exportDescription":
    "Showdown形式のテキストをコピーして構築を共有できます。",

  // 構築：詳細ページ。
  "teams.loading": "構築を読み込み中…",
  "teams.loadErrorDescription": "構築を読み込めませんでした。",
  "teams.notFound": "構築が見つかりません",
  "teams.notFoundDescription": "この構築は削除された可能性があります。",
  "teams.backToTeams": "構築一覧に戻る",
  "teams.memberCount": "{max}匹中{count}匹",
  "teams.public": "公開",
  "teams.publicTeam": "構築を公開",
  "teams.nameLabel": "構築名",
  "teams.rename": "名前を変更",
  "teams.renameTeam": "構築の名前を変更",
  "teams.renameTitle": "構築の名前を変更",
  "teams.renameDescription": "この構築の新しい名前を入力してください。",
  "teams.nameEmpty": "名前は空にできません。",
  "teams.duplicateTeam": "構築を複製",
  "teams.deleteTeam": "構築を削除",
  "teams.moreActions": "その他の操作",
  "teams.addPokemon": "ポケモンを追加",
  "teams.editPokemon": "ポケモンを編集",
  "teams.editorDescription":
    "ポケモン・もちもの・技・ステータスポイント（SP）を選択してください。",
  "teams.moveUp": "{name}を上へ移動",
  "teams.moveDown": "{name}を下へ移動",
  "teams.editMember": "{name}を編集",
  "teams.removeMember": "{name}を削除",
  "teams.nameThis": "構築に名前をつける",

  // 構築：分析。
  "teams.analysis": "構築分析",
  "teams.warningDuplicateSpecies": "重複ポケモン",
  "teams.warningDuplicateItem": "重複もちもの",
  "teams.warningSet": "設定の問題",
  "teams.defense": "防御",
  "teams.offense": "攻撃",
  "teams.speedTiers": "素早さライン",
  "teams.noMembers": "この構築にはまだポケモンがいません。",
  "teams.noDamagingMoves": "この構築には攻撃技がまだありません。",
  "teams.heatMapPokemon": "ポケモン",
  "teams.heatMapMoveType": "技タイプ",

  // 環境：ページ。
  "meta.title": "環境",
  "meta.month": "月",
  "meta.retry": "再試行",
  "meta.loadError": "環境データを読み込めませんでした",
  "meta.loadErrorIndex": "環境データのインデックスを読み込めませんでした。",
  "meta.loadErrorSnapshot": "この月のスナップショットを読み込めませんでした。",
  "meta.emptyTitle": "このルールのデータはまだありません",
  "meta.emptyDescription":
    "レーティングのデータが公開されると、ここに使用率スナップショットが表示されます。",
  "meta.noUsageData": "使用率データなし",

  // 環境：使用率ランキング。
  "meta.battles": "{count}バトル",
  "meta.regulation": "レギュレーション",
  "meta.usageRanking": "使用率ランキング",
  "meta.searchPokemon": "ポケモンを検索",
  "meta.rank": "順位",
  "meta.pokemon": "ポケモン",
  "meta.usage": "使用率",
  "meta.noMatches": "該当なし",
  "meta.noMatchesDescription": "「{query}」に一致するポケモンはいません。",
  "meta.clearSearch": "検索をクリア",

  // 環境：詳細ダイアログ。
  "meta.noData": "データなし。",
  "meta.moves": "技",
  "meta.items": "もちもの",
  "meta.abilities": "特性",
  "meta.teammates": "同時選出",
  "meta.spreads": "ステータス配分",
  "meta.addToTeam": "構築に追加",
  "meta.openInCalc": "計算機で開く",
  "meta.setBuildFailed": "この使用率データからは型を作成できませんでした。",
  "meta.rankUsage": "順位#{rank} · 使用率{usage}",

  // 環境：素早さライン。
  "meta.speedTiers": "素早さライン",
  "meta.maxMinSpeed": "最高{max} · 最低{min}",
  "meta.noSpreadData": "配分データなし。",
  "meta.noTierData":
    "このスナップショットには素早さラインのデータがありません。",
};
