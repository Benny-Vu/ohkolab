/**
 * The battle matching flow, composed by the board page: the author's own
 * requests with their offers, the matched banner with the Room ID exchange,
 * and the responder's own offer status. Each component works standalone and
 * takes the id (or summary) it renders, so the board wires them in.
 */
export { MyBattleRequestsPanel } from "@/features/battles/matching/my-battle-requests-panel";
export { MatchedBanner } from "@/features/battles/matching/matched-banner";
export { OfferStatus } from "@/features/battles/matching/offer-status";
