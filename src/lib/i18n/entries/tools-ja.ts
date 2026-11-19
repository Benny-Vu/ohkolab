/**
 * The Japanese half of the Tools dictionary. It lives in its own
 * file (and its own chunk) so the entry bundle only carries the English
 * strings; `ja.ts` imports it from the lazily loaded Japanese dictionary.
 * The keys and their English source of truth stay in `tools.ts`.
 */
import type { ToolsKey } from "@/lib/i18n/entries/tools";

export const toolsJa: { [K in ToolsKey]: string } = {
  // ダメージ計算：ページと共通コントロール。
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
  "calc.trickRoom": "トリックルーム",
  "calc.speedTailwind": "おいかぜ",
  "calc.speedParalysis": "まひ",
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

  // 構築：ChampionsのチームID。
  "teams.gameIdLabel": "チームID",
  "teams.gameIdFieldLabel": "Champions チームID",
  "teams.gameIdHint":
    "Championsで構築を共有して、そのIDをここに貼り付けてください。",
  "teams.gameIdInvalid": "チームIDは半角英数字10桁です。",
  "teams.gameIdCopied": "チームIDをコピーしました",
  "teams.gameIdCopyAria": "チームIDをコピー",
  "teams.gameIdBadge": "ID",
  "teams.gameIdShareText": "Champions チームID：{id}",

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
  "teams.untitled": "無題の構築",

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

  // 構築：分析の警告と弱点の文。
  "teams.warnDuplicateSpecies": "{name}が構築に{count}匹含まれています。",
  "teams.warnDuplicateItem": "{name}を{count}匹のポケモンが持っています。",
  "teams.warnSetProblem": "{name}：{problem}",
  "teams.weakSpot": "{type}に弱いポケモンが{count}匹",
  "teams.weakSpotNoResist": "{type}に弱いポケモンが{count}匹（耐性なし）",

  // 環境：ページ。
  "meta.month": "月",
  "meta.retry": "再試行",
  "meta.loadError": "環境データを読み込めませんでした",
  "meta.loadingAria": "環境データを読み込み中",
  "meta.loadErrorIndex": "環境データのインデックスを読み込めませんでした。",
  "meta.loadErrorSnapshot": "この月のスナップショットを読み込めませんでした。",
  "meta.emptyTitle": "このルールのデータはまだありません",
  "meta.emptyDescription":
    "レーティングのデータが公開されると、ここに使用率スナップショットが表示されます。",
  "meta.noUsageData": "使用率データなし",

  // 環境：ランキング表の下の出典表記。
  "meta.ratingCutoff": "レーティング{rating}以上",
  "meta.viaSmogon": "smogon.com/statsより",

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

  // ダメージ計算：共有リンク（share ウェーブ）。
  "calc.shareLinkInvalid":
    "計算機のリンクを読み込めなかったため、計算機をリセットしました。",

  // ダメージ計算：ダブルの2体目の防御側。
  "calc.secondDefender": "防御側2",
  "calc.addSecondDefender": "2体目の防御側を追加",
  "calc.removeSecondDefender": "2体目の防御側を削除",
  "calc.remove": "削除",
  "calc.spreadMove": "全体技 ×{factor}",
  "calc.singleTarget": "使用ごとに1体だけが対象",

  // 構築：開閉できる分析カード。
  "teams.analysisExpand": "構築分析を開く",
  "teams.analysisCollapse": "構築分析を閉じる",

  // 構築：特性によって変わる相性（「ロトム（ウォッシュ）：浮遊で地面を無効化」）。
  "teams.abilityImmune": "{pokemon}：{ability}で{type}を無効化",
  "teams.abilityResist": "{pokemon}：{ability}で{type}技のダメージを軽減",
  "teams.abilityVulnerable": "{pokemon}：{ability}で{type}技のダメージが増加",

  // 構築：技の範囲。
  "teams.coverageTitle": "技の範囲",
  "teams.coverageCount": "{total}タイプ中{count}タイプに効果抜群で攻撃可能",
  "teams.coverageGap": "{type}を効果抜群で攻撃できる技がありません",
  "teams.coverageComplete": "すべてのタイプに効果抜群で攻撃できる技があります",

  // 構築：素早さラインの表示。
  "teams.speedViewLabel": "素早さラインの表示",
  "teams.speedBase": "通常",
  "teams.speedScarf": "スカーフ ×1.5",
  "teams.speedTailwind": "追い風 ×2",
  "teams.speedTrickRoom": "トリックルーム",
  "teams.trickRoomNote":
    "トリックルーム中は遅いポケモンから行動します。先制技は先に動き、同じ素早さなら順番は入れ替わりません。",
};
