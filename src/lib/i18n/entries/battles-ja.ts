import type { BattlesKey } from "@/lib/i18n/entries/battles";

/**
 * The Japanese battles dictionary: exactly the same keys as the English one
 * (the parity test enforces it), with the same placeholders.
 */
export const battlesJa: { [K in BattlesKey]: string } = {
  // 対戦ボード（ナビとページタイトル）。
  "battles.title": "対戦",
  // Battle board
  "battles.description": "Championsの対戦相手を募集する。",
  "battles.newRequest": "対戦相手を募集",
  "battles.filterFormatAria": "フォーマットの絞り込み",
  "battles.filterLanguageAria": "言語の絞り込み",
  "battles.formatAll": "すべて",
  "battles.formatSingles": "シングル",
  "battles.formatDoubles": "ダブル",
  "battles.languageAll": "すべて",
  "battles.startingSoon": "開催間近",
  "battles.loadingAria": "対戦募集を読み込み中",
  "battles.loadError": "対戦募集を読み込めませんでした。",
  "battles.emptyTitle": "募集中の対戦はありません。",
  "battles.emptyDescription": "最初の募集を投稿してみましょう。",
  "battles.noMatches": "この条件に合う対戦募集はありません。",
  "battles.signInToBattle": "サインインして対戦相手を探す。",
  "battles.offer": "対戦を申し込む",
  "battles.offered": "申し込み済み",
  "battles.report": "報告",
  "battles.reportTitle": "対戦募集を報告",
  "battles.reportDescription":
    "この対戦募集の問題点をモデレーターに伝えてください。",
  "battles.reportReasonLabel": "理由",
  "battles.errorTooManyOpen":
    "募集中のリクエストが多すぎます。ひとつ閉じるか、マッチまで待ってください。",
  "battles.errorOfferCap":
    "本日の申し込み上限に達しました。また明日お試しください。",
  "battles.errorAlreadyOffered": "この募集にはすでに申し込んでいます。",
  "battles.errorGeneric": "問題が発生しました。もう一度お試しください。",
  "battles.startsAt": "開始 {time}（あなたの時間）",
  "battles.window": "{start} – {end}（あなたの時間）",
  "battles.until": "終了 {time}（あなたの時間）",
  "battles.unknownAuthor": "不明なプレイヤー",
  "battles.createDescription": "希望する対戦内容を書きましょう。",
  "battles.formatLabel": "フォーマット",
  "battles.rulesLabel": "ルール",
  "battles.rulesPlaceholder": "レギュM-C、3本先取",
  "battles.rulesRequired": "ルールを入力してください。",
  "battles.rulesTooLong": "ルールは80文字以内で入力してください。",
  "battles.quickPicksLabel": "クイック入力",
  "battles.chipRegMC": "レギュM-C",
  "battles.chipBestOf3": "3本先取",
  "battles.chipCasual": "カジュアル",
  "battles.noteLabel": "ひとこと（任意）",
  "battles.notePlaceholder": "対戦相手に伝えたいこと。",
  "battles.noteTooLong": "ひとことは300文字以内で入力してください。",
  "battles.windowLabel": "開催時間（任意）",
  "battles.startsAtLabel": "開始",
  "battles.endsAtLabel": "終了",
  "battles.windowOrder": "終了時間は開始時間より後にしてください。",
  "battles.languageLabel": "言語",
  "battles.teamLabel": "チーム（任意）",
  "battles.noTeam": "チームなし",
  "battles.teamPickerAria": "チームを添付",
  "battles.create": "募集する",
  "battles.createdToast": "対戦募集を投稿しました。",
  // デモモードのサンプル募集（録画モード専用、表示のみ）。
  "demo.battle1Rules": "レギュM-C、3本先取",
  "demo.battle1Note": "接戦できる相手を探しています。",
  "demo.battle2Rules": "ダブル、カジュアル",
  "demo.battle2Note": "雨パの調整中です。",
  "demo.battle3Rules": "シングル、伝説なし",
};
