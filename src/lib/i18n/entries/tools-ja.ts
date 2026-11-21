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
  "calc.noWeather": "天候なし",
  "calc.noTerrain": "フィールドなし",
  "calc.noStatus": "状態異常なし",

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
  "teams.openNamed": "{name}を開く",
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

  // 構築：チームプレビュー。
  "teams.previewAria": "チームプレビュー",
  "teams.previewNatureSr": "せいかく：{nature}",

  // 構築：印刷用チームシート。
  "teams.printTeamSheet": "チームシートを印刷",
  "teams.printModeLabel": "シートの内容",
  "teams.printModeFull": "完全な構築リスト",
  "teams.printModeOpen": "公開用チームシート",
  "teams.printPlayerName": "プレイヤー名",
  "teams.printPlayerId": "プレイヤーID",
  "teams.printPrivacyHint":
    "プレイヤー情報は印刷用です。保存も送信もされません。",
  "teams.printAction": "印刷",
  "teams.printLevel": "レベル50",
  "teams.printFooter": "OHKOLab で作成 · ohkolab.com",

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
  "meta.dataBadge": "レギュ {regulation}・使用率データは{updated}",
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

  // 環境：上位構築ビュー。
  "meta.viewUsage": "使用率",
  "meta.viewTopTeams": "上位構築",
  "meta.topTeamsLoading": "上位構築を読み込み中",
  "meta.topTeamsEmpty": "スナップショットに大会データがまだありません。",
  "meta.topTeamsError": "上位構築を読み込めませんでした。",
  "meta.topTeamsRetry": "再試行",
  "meta.topTeamsAttribution": "大会データはLimitless提供。",
  "meta.topTeamsSource": "Limitlessで見る",
  "meta.spAssumed":
    "ステータスポイント（SP）は未公開。よく使われる配分で補っています。",
  "meta.formatFilter": "レギュレーション",
  "meta.allFormats": "すべて",
  "meta.placing": "#{placing}位",
  "meta.record": "{wins}勝 {losses}敗",
  "meta.recordWithTies": "{wins}勝 {losses}敗 {ties}分",

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

  // バトルモード（/calc/battle）。チームプレビュー画面の相性確認。
  "battle.link": "バトルモード",
  "battle.mySide": "自分のチーム",
  "battle.savedTeam": "保存済みチーム",
  "battle.chooseTeam": "保存済みチームを選ぶ",
  "battle.noTeams": "保存済みチームはまだありません",
  "battle.pasteTeam": "チームを貼り付け",
  "battle.pasteMyTeamTitle": "自分のチームを貼り付け",
  "battle.pasteMyTeamDescription":
    "ポケモンショーダウンの形式で6体まで貼り付け。",
  "battle.usePaste": "貼り付けを使う",
  "battle.emptyMySide": "保存済みチームを選ぶか、貼り付けてはじめる。",
  "battle.opponents": "相手のチーム",
  "battle.opponentSpecies": "相手のポケモン",
  "battle.addOpponent": "相手を追加",
  "battle.recentPicks": "最近選んだポケモン",
  "battle.pastePreview": "チームプレビューから貼り付け",
  "battle.pastePreviewTitle": "相手のチームを貼り付け",
  "battle.pastePreviewDescription":
    "ショーダウンの形式か、1行に1体ずつ名前を貼り付け。",
  "battle.readTeam": "読み込む",
  "battle.emptyOpponents": "相手のポケモンを追加すると相性が見られます。",
  "battle.provenanceCommon": "よくあるセット",
  "battle.provenanceAssumed": "推定",
  "battle.provenanceCustom": "カスタム",
  "battle.removeOpponent": "{name}を削除",
  "battle.matrixMine": "自分から相手への最適技",
  "battle.matrixTheirs": "相手から自分への最適技",
  "battle.matrixAria": "ダメージ一覧。行が列へ攻撃",
  "battle.noDamagingMoves": "攻撃技なし",
  "battle.matrixLoading": "相性を計算中",
  "battle.emptyMatrix": "両チームに1体以上いると表示されます。",
  "battle.speedTitle": "素早さ順",
  "battle.speedAria": "12体の素早さ順",
  "battle.tailwindMine": "自分側の追い風",
  "battle.tailwindTheirs": "相手側の追い風",
  "battle.scarf": "こだわりスカーフ",
  "battle.scarfAria": "{name}のこだわりスカーフ",
  "battle.sideYou": "自分",
  "battle.sideOpponent": "相手",
  "battle.speedValueSr": "{name}：補正前の素早さは{base}、補正後は{final}",

  // バトルモード：バトルメモ（/notes とバトルモード内）。ページの
  // タイトルと説明はシェルドメインに置く。
  "battle.provenanceRevealed": "判明",
  "battle.notesLocalOnly":
    "メモはこの端末にだけ保存され、どこにも送信されません。",
  "battle.notesOpenStandalone": "単独ページで開く",
  "battle.notesOpenBattle": "バトルモードを開く",
  "battle.notesGame": "ゲーム",
  "battle.notesBrought": "このゲームの選出",
  "battle.notesEmpty": "ポケモンを追加するとメモを始められます。",
  "battle.notesAddSpecies": "ポケモンを追加",
  "battle.notesNewSet": "新しい相手",
  "battle.notesArchived": "メモをアーカイブしました",
  "battle.notesMega": "メガシンカ済み",
  "battle.notesUnrevealed": "未判明",
  "battle.notesNothingRevealed": "まだ何も判明していません",
  "battle.notesHasNote": "メモあり",
  "battle.notesCard": "{name}のメモ",
  "battle.notesSpeed": "素早さメモ",
  "battle.notesRelationFaster": "より速い",
  "battle.notesRelationSlower": "より遅い",
  "battle.notesRelationTie": "同速",
  "battle.notesMyPokemon": "自分のポケモン",
  "battle.notesMySpeed": "その素早さ",
  "battle.notesPickMineAria": "自分のポケモンを選ぶ",
  "battle.notesAddRelation": "メモする",
  "battle.notesPlainHint":
    "素早さがなければ、ただのメモとして保存されます（範囲は計算されません）。",
  "battle.notesFasterChip": "自分の{name}（{speed}）より速い",
  "battle.notesSlowerChip": "自分の{name}（{speed}）より遅い",
  "battle.notesTieChip": "自分の{name}（{speed}）と同速",
  "battle.notesFasterPlain": "自分の{name}より速い",
  "battle.notesSlowerPlain": "自分の{name}より遅い",
  "battle.notesTiePlain": "自分の{name}と同速",
  "battle.notesFieldPriority": "先制技",
  "battle.notesPriorityCount": "先制技は範囲に入れません。",
  "battle.rangeAtLeast": "素早さは最低{min}。",
  "battle.rangeAtMost": "素早さは最高{max}。",
  "battle.rangeBetween": "素早さは{min}〜{max}。",
  "battle.rangePlain": "範囲はまだありません。素早さを入力してください。",
  "battle.hintScarf": "こだわりスカーフ持ちのはず。",
  "battle.hintBoostMax":
    "素早さに良いせいかく（{nature}）+ 素早さSP32振りのはず。",
  "battle.hintBoostOrScarf":
    "素早さに良いせいかく、またはこだわりスカーフのはず。",
  "battle.hintUninvested":
    "無振り、または素早さに悪いせいかく（{nature}）のはず。",
  "battle.hintSlowed":
    "最低値より遅いです。まひや素早さ低下（こごえるかぜなど）を受けているはず。",
  "battle.hintBoosted":
    "こだわりスカーフでも届かない速さです。メモにない素早さ上昇があるはず。",
  "battle.hintInconsistent": "矛盾しています。メモを見直してください。",
  "battle.speedFromNotes": "メモから",
  "battle.bandAtLeast": "≥{min}",
  "battle.bandAtMost": "≤{max}",
  "battle.bandBetween": "{min}〜{max}",
  "battle.notesRemoveChip": "素早さメモを削除",
  "battle.notesRemoveCard": "{name}を削除",
  "battle.notesNote": "メモ",
  "battle.notesNotePlaceholder": "他に覚えておきたいこと",
  "battle.notesTurnLog": "ターンメモ",
  "battle.notesTurnValue": "ターン{n}",
  "battle.notesTurnDown": "ターンを戻す",
  "battle.notesTurnUp": "ターンを進める",
  "battle.notesTurnLine": "T{turn}：{move} → {species}",
  "battle.notesLogMove": "{species}の{move}を記録",
  "battle.notesLinePlaceholder": "メモを入力…",
  "battle.notesAddLine": "追加",
  "battle.notesRemoveLine": "行を削除",
  "battle.notesAddMove": "技を追加",
  "battle.notesHistoryEntry": "{date}・{count}体",
  "battle.notesShowHistory": "アーカイブを表示",
  "battle.notesHideHistory": "アーカイブを隠す",
  "battle.notesDeleteHistoryEntry": "{date}のメモを削除",
  "battle.notesClearHistory": "すべて削除",
  "battle.notesHistoryCleared": "アーカイブを削除しました",

  // ダメージ計算：型の出典ラベル、その切り替え、計算結果の下の前提行。
  "calc.setSourceCommon": "定番の型 ・ {usage}",
  "calc.setSourceCommonN": "定番の型{index} ・ {usage}",
  "calc.setSourceCustom": "カスタム",
  "calc.setSourceAssumed": "想定のステータスポイント",
  "calc.setOptionN": "型{index}",
  "calc.setSourceAria": "{side}の型の出典",
  "calc.assumptionsLabel": "前提",
  "calc.level50": "レベル50",

  // ダメージ計算：既知の制限メモ。
  "calc.knownLimitations": "既知の制限",
  "calc.limitationWeather":
    "場に出たときに天候やフィールドを起こす特性（あまごい、ひでり、各種グミ）は自動ではオンになりません。天候とフィールドを自分で設定してください。",
  "calc.limitationSecondary":
    "計算するのはダメージの乱数だけです。技の追加効果（ひるみ、ランク変化、二次的な状態異常）は結果に含まれません。",
  "calc.limitationRecoil":
    "反動ダメージと自傷は表示されず、いしあたまなどの反動を無効する特性も反映されません。",
  "calc.limitationLearnsets":
    "技の候補は本編の思い出せる技をChampionsの技リストで絞ったものなので、Championsでは実際に使えない技がまれに含まれます。",

  // 録画モード（?demo=1）。空のリスト代わりに表示するサンプル構築。
  // サンプルであることが明示され、データベースには書き込まれない。
  "demo.team1Name": "あめの構築",
  "demo.team2Name": "トリックルーム軸",
};
