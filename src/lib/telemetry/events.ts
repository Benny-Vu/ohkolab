import type { BattleFormat } from "@/types/battle";

/**
 * The telemetry event catalogue. `track()` only accepts these names, so an
 * event outside the catalogue does not compile.
 */
export type TelemetryEvent =
  | "page_viewed"
  | "calc_result_viewed"
  | "calc_description_copied"
  | "team_created"
  | "team_imported"
  | "team_exported"
  | "team_made_public"
  | "metagame_viewed"
  | "search_opened"
  | "search_result_chosen"
  | "sign_up_completed"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "welcome_completed"
  | "welcome_skipped"
  | "post_created"
  | "comment_created"
  | "post_liked"
  | "user_followed"
  | "group_created"
  | "group_joined"
  | "feedback_sent"
  | "link_shared"
  | "share_card_saved"
  | "source_visit"
  | "theme_changed";

export type SearchKind = "pokemon" | "move" | "item" | "page";
type SignUpMethod = "email" | "google" | "discord";
type PostAttachment = "none" | "team" | "calc";
type FeedbackEventKind = "bug" | "idea" | "other";
/** What was shared, by the link's route — never the link itself. */
export type SharedLinkKind = "calc" | "team" | "profile" | "post" | "group";

/** A marketing platform a visitor arrived from, and nothing else. */
export type SourceName =
  "tiktok" | "shorts" | "reels" | "reddit" | "bluesky" | "note";

/** The properties each catalogue event carries, beyond the shared ones. */
interface EventProperties {
  /** Sent as PostHog's standard $pageview event, never as a custom event. */
  page_viewed: { route: string; format?: BattleFormat };
  calc_result_viewed: {
    format: BattleFormat;
    attacker: string;
    defender: string;
    move: string;
    ko: boolean;
  };
  calc_description_copied: { format: BattleFormat };
  team_created: { format: BattleFormat; size: number };
  team_imported: { format: BattleFormat; size: number };
  team_exported: { format: BattleFormat; size: number };
  team_made_public: { format: BattleFormat; size: number };
  metagame_viewed: { format: BattleFormat; month: string };
  search_opened: { kind: SearchKind };
  search_result_chosen: { kind: SearchKind };
  sign_up_completed: { method: SignUpMethod };
  onboarding_completed: Record<string, never>;
  onboarding_skipped: Record<string, never>;
  welcome_completed: Record<string, never>;
  welcome_skipped: Record<string, never>;
  post_created: { attachment: PostAttachment; in_group: boolean };
  comment_created: Record<string, never>;
  post_liked: Record<string, never>;
  user_followed: Record<string, never>;
  group_created: { visibility: string };
  group_joined: { visibility: string };
  feedback_sent: { kind: FeedbackEventKind };
  link_shared: { kind: SharedLinkKind };
  /** What was rendered to PNG, and in which format and language. */
  share_card_saved: {
    kind: "team" | "calc" | "post";
    format: "1080x1920" | "1200x630";
    language: "en" | "ja";
  };
  /** Which platform the visitor came from — the only property it carries. */
  source_visit: { source: SourceName };
  theme_changed: { theme: "dark" | "light" };
}

/** Added automatically to every event; callers never set these. */
export interface SharedEventProps {
  app_version: string;
  platform: "web" | "ios" | "android";
  screen_size: "phone" | "tablet" | "desktop";
}

export type EventProps<E extends TelemetryEvent> = EventProperties[E];
