/**
 * The battles dictionary: the battle board, the create form, the offers and
 * the matched exchange. Owned by the battles wave; the Japanese side must
 * keep exactly the same keys (the parity test enforces it).
 */

export const battlesEn = {
  // The board's own frame (the nav entry and the page title).
  "battles.title": "Battles",

  // Battle matching
  "battles.myRequestsTitle": "My battle requests",
  "battles.noRequests": "No battle requests yet. Create one.",
  "battles.loadingMyRequestsAria": "Loading your battle requests",
  "battles.statusOpen": "Open",
  "battles.statusMatched": "Matched",
  "battles.statusClosed": "Closed",
  "battles.statusExpired": "Expired",
  "battles.offersHeading": "Offers",
  "battles.noOffers": "No offers yet.",
  "battles.accept": "Accept",
  "battles.acceptFrom": "Accept {name}'s offer",
  "battles.decline": "Decline",
  "battles.declineFrom": "Decline {name}'s offer",
  "battles.declinedLabel": "Declined",
  "battles.withdrawnLabel": "Withdrawn",
  "battles.closeRequest": "Close request",
  "battles.reopenRequest": "Reopen request",
  "battles.acceptedToast": "Offer accepted. The conversation is in Messages.",
  "battles.acceptedNoDmToast":
    "Offer accepted. Share the Room ID in the request.",
  "battles.openConversation": "Open the conversation",
  "battles.declinedToast": "Offer declined.",
  "battles.actionFailed": "That did not go through. Try again.",
  "battles.matchedTitle": "Matched with {name}",
  "battles.openMessages": "Open messages",
  "battles.roomIdLabel": "Room ID",
  "battles.roomIdPlaceholder": "Room ID or Trainer ID",
  "battles.save": "Save",
  "battles.codeVisibleHint": "Visible only to the two of you.",
  "battles.codeFallbackHint":
    "If no message thread could open, share the Room ID here.",
  "battles.codeSavedToast": "Room ID saved.",
  "battles.markPlayed": "Mark as played",
  "battles.playedLine": "Played",
  "battles.offerPending": "Offer pending",
  "battles.offerAccepted": "Offer accepted",
  "battles.offerDeclined": "Offer declined",
  "battles.offerWithdrawn": "Offer withdrawn",
  "battles.withdrawOffer": "Withdraw offer",
  "battles.withdrawnToast": "Offer withdrawn.",
  "battles.someone": "Someone",
  "battles.notificationLine": "sent you a battle request update",
  "demo.conversation1Name": "Rika",
  "demo.conversation1Preview": "Room ID is 4821. Ready when you are.",
  "demo.conversation2Name": "Kenta",
  "demo.conversation2Preview": "Best of 3, Reg M-C. See you at 8.",
  "demo.conversation3Name": "Mio",
  "demo.conversation3Preview": "Good games. Your Amoonguss was a problem.",
} as const;

export type BattlesKey = keyof typeof battlesEn;
