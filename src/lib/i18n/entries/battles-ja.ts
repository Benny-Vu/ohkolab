import type { BattlesKey } from "@/lib/i18n/entries/battles";

/**
 * The Japanese battles dictionary: exactly the same keys as the English one
 * (the parity test enforces it), with the same placeholders.
 */
export const battlesJa: { [K in BattlesKey]: string } = {
  // 対戦ボード（ナビとページタイトル）。
  "battles.title": "対戦",

  // バトルマッチング。
  "battles.myRequestsTitle": "自分の対戦リクエスト",
  "battles.noRequests": "対戦リクエストはまだありません。作成しましょう。",
  "battles.loadingMyRequestsAria": "対戦リクエストを読み込み中",
  "battles.statusOpen": "募集中",
  "battles.statusMatched": "マッチ済み",
  "battles.statusClosed": "受付終了",
  "battles.statusExpired": "期限切れ",
  "battles.offersHeading": "オファー",
  "battles.noOffers": "オファーはまだありません。",
  "battles.accept": "承諾",
  "battles.acceptFrom": "{name}のオファーを承諾",
  "battles.decline": "辞退",
  "battles.declineFrom": "{name}のオファーを辞退",
  "battles.declinedLabel": "辞退済み",
  "battles.withdrawnLabel": "取り下げ済み",
  "battles.closeRequest": "リクエストを締め切る",
  "battles.reopenRequest": "リクエストを再開する",
  "battles.acceptedToast":
    "オファーを承諾しました。トークはメッセージにあります。",
  "battles.acceptedNoDmToast":
    "オファーを承諾しました。ルームIDをリクエスト内で共有してください。",
  "battles.openConversation": "トークを開く",
  "battles.declinedToast": "オファーを辞退しました。",
  "battles.actionFailed": "処理できませんでした。もう一度お試しください。",
  "battles.matchedTitle": "{name}とマッチしました",
  "battles.openMessages": "メッセージを開く",
  "battles.roomIdLabel": "ルームID",
  "battles.roomIdPlaceholder": "ルームIDまたはトレーナーID",
  "battles.save": "保存",
  "battles.codeVisibleHint": "二人だけが見られます。",
  "battles.codeFallbackHint":
    "トークを開けなかった場合は、ここでルームIDを共有してください。",
  "battles.codeSavedToast": "ルームIDを保存しました。",
  "battles.markPlayed": "対戦済みにする",
  "battles.playedLine": "対戦済み",
  "battles.offerPending": "オファー承認待ち",
  "battles.offerAccepted": "オファーが承諾されました",
  "battles.offerDeclined": "オファーは辞退されました",
  "battles.offerWithdrawn": "オファーは取り下げられました",
  "battles.withdrawOffer": "オファーを取り下げる",
  "battles.withdrawnToast": "オファーを取り下げました。",
  "battles.someone": "誰か",
  "battles.notificationLine": "さんから対戦リクエストの更新が届きました",
  "demo.conversation1Name": "リカ",
  "demo.conversation1Preview": "ルームIDは4821です。いつでもどうぞ。",
  "demo.conversation2Name": "ケンタ",
  "demo.conversation2Preview": "3本先取、レギュM-Cで。20時に。",
  "demo.conversation3Name": "ミオ",
  "demo.conversation3Preview": "いい対戦でした。モロバレルが手強かったです。",
};
