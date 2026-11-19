/**
 * Database schema as the Supabase client sees it. Hand-written to match the
 * SQL in `supabase/migrations/`: when a migration changes a table, change this
 * file in the same commit.
 *
 * Nullability mirrors the migrations. Every `teams` column is NOT NULL, as in
 * the live project.
 */
import type { BattleFormat } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          /** Same id as the auth user. */
          id: string;
          /** 3 to 20 characters: lowercase letters, digits, underscores. Unique. */
          username: string;
          /** Up to 40 characters. */
          display_name: string | null;
          /** Species name from the Champions roster, e.g. "Garchomp". */
          avatar_species: string | null;
          /** Up to 300 characters. */
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        /**
         * Rows are created by a trigger on `auth.users`; no role may insert
         * through the API. The type exists because the client requires one.
         */
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_species?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        /** Only these four columns are granted for update. */
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_species?: string | null;
          bio?: string | null;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          /**
           * The team members. Stored as `jsonb`: the database only checks that
           * it is an array of at most six entries, so validate what you read
           * before trusting it.
           */
          data: PokemonSet[];
          format: BattleFormat;
          is_public: boolean;
          /**
           * The Champions "Replica Team" ID: 10 letters and digits,
           * case-sensitive, or null when the team has none.
           */
          game_team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          /** Defaults to the signed-in user. */
          user_id?: string;
          name: string;
          data: PokemonSet[];
          format?: BattleFormat;
          is_public?: boolean;
          game_team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          data?: PokemonSet[];
          format?: BattleFormat;
          is_public?: boolean;
          game_team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          /** 1 to 2000 characters. */
          body: string;
          /**
           * Optional team or calc snapshot, stored as `jsonb`. The database
           * only checks that it is an object or array of at most 8 KiB
           * serialized, so validate what you read before trusting it.
           */
          attachment: Json | null;
          /** The group the post belongs to, or null on the main feed. */
          group_id: string | null;
          created_at: string;
          updated_at: string;
          /** Set by a moderator through `remove_post()`; null while visible. */
          removed_at: string | null;
          removed_by: string | null;
        };
        Insert: {
          id?: string;
          /** Row-level security forces this to the signed-in user. */
          author_id: string;
          body: string;
          attachment?: Json | null;
          /** Row-level security forces active membership of this group. */
          group_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        /** Only `body` is granted for update; `updated_at` is set by a trigger. */
        Update: {
          body?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          /** 1 to 1000 characters. */
          body: string;
          created_at: string;
          /** Set by a moderator through `remove_comment()`; null while visible. */
          removed_at: string | null;
          removed_by: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          /** Row-level security forces this to the signed-in user. */
          author_id: string;
          body: string;
          created_at?: string;
        };
        /** Only `body` is granted for update. */
        Update: {
          body?: string;
        };
        Relationships: [];
      };
      post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        /** No column may be updated; likes are inserted and deleted only. */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          followee_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          followee_id: string;
          created_at?: string;
        };
        /** No column may be updated; follows are inserted and deleted only. */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        /** No column may be updated; blocks are inserted and deleted only. */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          /** Null once the reporter's account is deleted; the report is kept. */
          reporter_id: string | null;
          /** One of "post", "comment", "profile". */
          target_type: string;
          /** Id of the reported post, comment or profile. Not a foreign key. */
          target_id: string;
          /** One of "spam", "harassment", "inappropriate", "other". */
          reason: string;
          /** Up to 500 characters. */
          details: string | null;
          /** One of "open", "actioned", "dismissed". */
          status: string;
          created_at: string;
          handled_by: string | null;
          handled_at: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          details?: string | null;
          created_at?: string;
        };
        /** Only `status` is granted for update, through `handle_report()`. */
        Update: {
          status?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          /** One of "admin", "moderator". */
          role: string;
        };
        Insert: {
          user_id: string;
          role: string;
        };
        /** No role may write roles through the API. */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      user_suspensions: {
        Row: {
          /** Synthetic key; the record survives its user's deletion. */
          id: string;
          /** The suspended user; null if their account was deleted. */
          user_id: string | null;
          /** The suspension ends when `until` passes. */
          until: string;
          /** Up to 500 characters. */
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          until: string;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        /** No role may write suspensions through the API; use `suspend_user()`. */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      moderation_actions: {
        Row: {
          id: string;
          /** One of "post", "comment", "profile". */
          target_type: string;
          /**
           * Id of the removed post or comment, or of the suspended profile.
           * Not a foreign key: the record survives its target being deleted.
           */
          target_id: string;
          /** The user the action was taken against; null if deleted. */
          target_user_id: string | null;
          /** One of "remove", "suspend". */
          action: string;
          /** 1 to 500 characters. */
          reason: string;
          /** The report that led to this action, when there was one. */
          report_id: string | null;
          /** The moderator who acted; null if deleted. */
          moderator_id: string | null;
          /**
           * Copy of the removed text, taken at the moment of removal.
           * Null for actions written before the clean-up wave and for
           * suspensions.
           */
          content_snapshot: string | null;
          /** One of "post", "comment", "group_post"; null for suspensions. */
          content_kind: string | null;
          /** The suspension this action created, for suspensions. */
          suspension_id: string | null;
          /**
           * Paths of the removed post's image files (pending and public
           * copies), so the cleanup Edge Function can move them to
           * quarantine. Null for actions on text-only posts and for
           * suspensions.
           */
          media_paths: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: string;
          target_id: string;
          target_user_id?: string | null;
          action: string;
          reason: string;
          report_id?: string | null;
          moderator_id?: string | null;
          content_snapshot?: string | null;
          content_kind?: string | null;
          suspension_id?: string | null;
          media_paths?: string[] | null;
          created_at?: string;
        };
        /**
         * No role may write moderation actions through the API; only the
         * security-definer moderation functions insert them.
         */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      appeals: {
        Row: {
          id: string;
          moderation_action_id: string;
          /** The appellant; null if their account was deleted. */
          appellant_id: string | null;
          /** 1 to 1000 characters. */
          message: string;
          /** One of "open", "upheld", "reversed". */
          status: string;
          created_at: string;
          /** Set by `handle_appeal()`; null while the appeal is open. */
          handled_by: string | null;
          handled_at: string | null;
        };
        Insert: {
          id?: string;
          moderation_action_id: string;
          /** Row-level security forces this to the signed-in user. */
          appellant_id: string;
          message: string;
          created_at?: string;
        };
        /**
         * No update grant: `handle_appeal()` is the only writer of status,
         * handled_by and handled_at.
         */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          /** 3 to 40 characters: lowercase letters, digits, hyphens. Unique. */
          slug: string;
          /** 1 to 60 characters. */
          name: string;
          /** Up to 500 characters. */
          description: string | null;
          /** One of "public", "invite_only". */
          visibility: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          visibility?: string;
          /** Row-level security forces this to the signed-in user. */
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        /** Only name, description and visibility are granted for update. */
        Update: {
          name?: string;
          description?: string | null;
          visibility?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          /** One of "owner", "moderator", "member". */
          role: string;
          /** One of "active", "invited", "requested". */
          status: string;
          created_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: string;
          status?: string;
          created_at?: string;
        };
        /** Only status (invitees) and role (owners) are granted for update. */
        Update: {
          status?: string;
          role?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          /** Who did it; null when the actor's account is deleted. */
          actor_id: string | null;
          /** One of "like", "comment", "follow", "moderation", "appeal", "group_invite". */
          type: string;
          post_id: string | null;
          comment_id: string | null;
          group_id: string | null;
          moderation_action_id: string | null;
          /** Null until the recipient marks the notification read. */
          read_at: string | null;
          created_at: string;
          /**
           * Set by the send-push Edge Function when it claims the
           * notification for a push. Never written by clients.
           */
          pushed_at: string | null;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          type: string;
          post_id?: string | null;
          comment_id?: string | null;
          group_id?: string | null;
          moderation_action_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        /** Only `read_at` is granted for update. */
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      post_images: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          /** 0 to 3; at most 4 images per post (unique with post_id). */
          position: number;
          /**
           * Path inside the private post-images-pending bucket:
           * {uid}/{post_id}/{image_id}.webp
           */
          pending_path: string;
          /**
           * Path inside the public post-images bucket; set by the screening
           * Edge Function, null until approved.
           */
          public_path: string | null;
          width: number;
          height: number;
          /** At most 1048576 (1 MB) per the bucket limit. */
          bytes: number;
          /** One of "pending", "approved", "rejected", "blocked". */
          status: string;
          /**
           * What the screening found (the moderation API response), stored
           * as `jsonb` of at most 8 KiB serialized. Validate what you read
           * before trusting it.
           */
          screen_result: Json | null;
          /** Set by the screening Edge Function when it decides. */
          screened_at: string | null;
          /** Optional description, up to 300 characters. */
          alt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          /** Row-level security forces this to the signed-in user. */
          author_id: string;
          position: number;
          pending_path: string;
          width: number;
          height: number;
          bytes: number;
          alt?: string | null;
          created_at?: string;
        };
        /**
         * No update grant: status, public_path, screen_result and
         * screened_at are written only by the screening Edge Function's
         * service role.
         */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          /** Row-level security forces this to the signed-in user. */
          user_id: string;
          /** One of "bug", "idea", "other". */
          kind: string;
          /** 10 to 2000 characters. */
          message: string;
          /**
           * Technical details from the client (page, app version, browser,
           * screen size, last crash id), stored as `jsonb` of at most 2000
           * bytes serialized. Validate what you read before trusting it.
           */
          context: Json | null;
          /** One of "new", "seen", "done". */
          status: string;
          created_at: string;
          /** Set by `set_feedback_status()`; null until then. */
          handled_by: string | null;
          handled_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          message: string;
          context?: Json | null;
          created_at?: string;
        };
        /**
         * No update grant: `set_feedback_status()` is the only writer of
         * status, handled_by and handled_at.
         */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      /** Direct messages, built but not launched (VITE_DIRECT_MESSAGES). */
      profile_birth_dates: {
        Row: {
          user_id: string;
          /** Not in the future, at least 16 years ago. */
          birth_date: string;
          updated_at: string;
        };
        /**
         * Rows are written by `set_birth_date()`; no role may insert
         * through the API. The type exists because the client requires one.
         */
        Insert: { [_ in never]: never };
        /** No update grant: `set_birth_date()` is the only writer. */
        Update: { [_ in never]: never };
        Relationships: [];
      };
      message_settings: {
        Row: {
          user_id: string;
          /** "friends" (default), "following" or "nobody". */
          who_can_message: string;
          updated_at: string;
        };
        /**
         * Rows are created by the profiles trigger; no role may insert
         * through the API.
         */
        Insert: { [_ in never]: never };
        /** Only who_can_message is granted for update. */
        Update: { who_can_message?: string };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          /** The two participants, sorted: user_a < user_b. */
          user_a: string;
          user_b: string;
          /** Who started the conversation (rate limiting starts per sender). */
          created_by: string;
          created_at: string;
        };
        /** Rows are created by `start_conversation()` only. */
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          user_id: string;
          /** Drives the unread markers. */
          last_read_at: string;
          /** Reserved for a manual "close conversation"; null for now. */
          closed_at: string | null;
        };
        /** Rows are created by `start_conversation()` only. */
        Insert: { [_ in never]: never };
        /** Only last_read_at is granted for update. */
        Update: { last_read_at?: string };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          /** 1 to 2000 characters. */
          body: string;
          created_at: string;
          /** Set when the sender deletes the message; the row stays. */
          deleted_at: string | null;
          /**
           * Set by the send-push Edge Function when it claims the message
           * for a push. Never written by clients.
           */
          pushed_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          /** Must be the caller; checked again by the insert trigger. */
          sender_id: string;
          body: string;
          created_at?: string;
        };
        /** Only deleted_at is granted for update, on the sender's own rows. */
        Update: { deleted_at?: string };
        Relationships: [];
      };
      message_reports: {
        Row: {
          id: string;
          /** The moderation queue row this snapshot belongs to. */
          report_id: string;
          /** Null once the reporter's account is deleted; the report stays. */
          reporter_id: string | null;
          /** Not a foreign key: the message may be gone; the snapshot stays. */
          message_id: string;
          conversation_id: string;
          /**
           * The reported message plus the 20 before it, oldest first:
           * `[{id, sender_id, body, created_at}, ...]`. Validate what you
           * read before trusting it.
           */
          snapshot: Json;
          created_at: string;
        };
        /** Rows are created by `report_message()` only. */
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          /** The FCM registration token; unique across the table. */
          token: string;
          /** One of "android", "ios", "web". */
          platform: string;
          created_at: string;
          /** Refreshed on every registration event (FCM rotates tokens). */
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform?: string;
          created_at?: string;
          last_seen_at?: string;
        };
        Update: {
          token?: string;
          platform?: string;
          last_seen_at?: string;
        };
        Relationships: [];
      };
      push_settings: {
        Row: {
          user_id: string;
          /** The master switch; off stops every push. */
          enabled: boolean;
          /** Per-kind switches; a missing row means everything on. */
          likes: boolean;
          comments: boolean;
          follows: boolean;
          groups: boolean;
          messages: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          enabled?: boolean;
          likes?: boolean;
          comments?: boolean;
          follows?: boolean;
          groups?: boolean;
          messages?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        /** No delete: rows go away only with the account. */
        Update: {
          enabled?: boolean;
          likes?: boolean;
          comments?: boolean;
          follows?: boolean;
          groups?: boolean;
          messages?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_config: {
        Row: {
          id: boolean;
          /** Where the send-push Edge Function lives; null = delivery off. */
          function_url: string | null;
          /** Sent as x-webhook-key; null = delivery off. */
          webhook_secret: string | null;
        };
        /** RLS has no policies: no client can read or write this table. */
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
    };
    Views: {
      /**
       * Read model for the feed: one row per visible post with the author's
       * profile fields and per-post counts. Security invoker: it respects the
       * same row-level security rules as the tables.
       */
      feed_posts: {
        Row: {
          id: string;
          author_id: string;
          body: string;
          attachment: Json | null;
          created_at: string;
          updated_at: string;
          author_username: string;
          author_display_name: string | null;
          author_avatar_species: string | null;
          like_count: number;
          comment_count: number;
          /** Whether the current signed-in user liked the post. */
          liked_by_me: boolean;
          /** The group the post belongs to, or null on the main feed. */
          group_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      /** Deletes the calling user's auth account and, by cascade, their data. */
      delete_own_account: {
        Args: never;
        Returns: undefined;
      };
      /** True when the first user has blocked the second. Used by policies. */
      has_blocked: {
        Args: { blocker_user_id: string; blocked_user_id: string };
        Returns: boolean;
      };
      /** True when the calling user has the admin or moderator role. */
      is_moderator: {
        Args: never;
        Returns: boolean;
      };
      /** True when the given user has an active suspension. */
      is_suspended: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      /** Moderators only: marks a post removed. */
      remove_post: {
        Args: { target_post_id: string };
        Returns: undefined;
      };
      /** Moderators only: marks a comment removed. */
      remove_comment: {
        Args: { target_comment_id: string };
        Returns: undefined;
      };
      /** Moderators only: sets a report to "actioned" or "dismissed". */
      handle_report: {
        Args: { target_report_id: string; new_status: string };
        Returns: undefined;
      };
      /** Moderators only: suspends a user until a given time. */
      suspend_user: {
        Args: {
          target_user_id: string;
          suspend_until: string;
          suspension_reason: string;
        };
        Returns: undefined;
      };
      /** True when the calling user is an active member of the group. */
      is_group_member: {
        Args: { target_group_id: string };
        Returns: boolean;
      };
      /** The calling user's role in the group, or null when not a member. */
      group_role: {
        Args: { target_group_id: string };
        Returns: string;
      };
      /**
       * Moderators only: removes a post, records the reason in
       * moderation_actions and notifies the author.
       */
      remove_post_with_reason: {
        Args: {
          target_post_id: string;
          removal_reason: string;
          source_report_id?: string;
        };
        Returns: undefined;
      };
      /**
       * Moderators only: removes a comment, records the reason in
       * moderation_actions and notifies the author.
       */
      remove_comment_with_reason: {
        Args: {
          target_comment_id: string;
          removal_reason: string;
          source_report_id?: string;
        };
        Returns: undefined;
      };
      /**
       * Moderators only: suspends a user, records the reason in
       * moderation_actions and notifies them.
       */
      suspend_user_with_reason: {
        Args: {
          target_user_id: string;
          suspend_until: string;
          suspension_reason: string;
          source_report_id?: string;
        };
        Returns: undefined;
      };
      /** Moderators only: upholds or reverses an appeal. */
      handle_appeal: {
        Args: { target_appeal_id: string; decision: string };
        Returns: undefined;
      };
      /**
       * Group owners and moderators only: removes a post in their group,
       * records the reason in moderation_actions and notifies the author.
       */
      remove_group_post: {
        Args: { target_post_id: string; removal_reason: string };
        Returns: undefined;
      };
      /** Moderators only: sets feedback to "seen" or "done". */
      set_feedback_status: {
        Args: { feedback_id: string; new_status: string };
        Returns: undefined;
      };
      /** Direct messages (behind VITE_DIRECT_MESSAGES). */
      /** Sets the caller's own birth date; rejects future and under-16. */
      set_birth_date: {
        Args: { new_birth_date: string };
        Returns: undefined;
      };
      /** True when the user is 18 or older; false without a birth date. */
      is_adult: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      /**
       * Starts (or returns the existing) conversation with the other user,
       * checking every rule server side. Error codes: P0A08 (too many new
       * conversations today), 42501 (block, setting or minor rule), 23514
       * (account too new or email not confirmed).
       */
      start_conversation: {
        Args: { other: string };
        Returns: string;
      };
      /**
       * Whether the caller may start a conversation with the other user
       * (the profile Message button asks this; the rules live server side).
       */
      can_message: {
        Args: { other: string };
        Returns: boolean;
      };
      /**
       * Copies the message and the 20 before it into a snapshot, files the
       * report in the moderation queue (reusing its rate limit) and returns
       * the queue row's id.
       */
      report_message: {
        Args: { message_id: string; reason: string };
        Returns: string;
      };
      /**
       * Service role only: claims every unpushed pushable notification for
       * one recipient (setting pushed_at), newest first. Returns nothing
       * when a push went out in the last minute.
       */
      claim_push_batch: {
        Args: { p_recipient: string };
        Returns: {
          id: string;
          type: string;
          actor_id: string | null;
          post_id: string | null;
          group_id: string | null;
          created_at: string;
        }[];
      };
      /**
       * Service role only: claims every unpushed message for one recipient
       * (setting pushed_at), newest first. Returns nothing when a push went
       * out in the last minute. Never returns the message body.
       */
      claim_push_messages: {
        Args: { p_recipient: string };
        Returns: {
          id: string;
          conversation_id: string;
          sender_id: string;
          created_at: string;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
export type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
export type TeamUpdate = Database["public"]["Tables"]["teams"]["Update"];
export type PostRow = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];
export type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
export type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"];
export type CommentUpdate = Database["public"]["Tables"]["comments"]["Update"];
export type PostLikeRow = Database["public"]["Tables"]["post_likes"]["Row"];
export type FollowRow = Database["public"]["Tables"]["follows"]["Row"];
export type BlockRow = Database["public"]["Tables"]["blocks"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];
export type UserRoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
export type UserSuspensionRow =
  Database["public"]["Tables"]["user_suspensions"]["Row"];
export type ModerationActionRow =
  Database["public"]["Tables"]["moderation_actions"]["Row"];
export type AppealRow = Database["public"]["Tables"]["appeals"]["Row"];
export type AppealInsert = Database["public"]["Tables"]["appeals"]["Insert"];
export type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
export type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
export type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];
export type GroupMemberRow =
  Database["public"]["Tables"]["group_members"]["Row"];
export type GroupMemberInsert =
  Database["public"]["Tables"]["group_members"]["Insert"];
export type GroupMemberUpdate =
  Database["public"]["Tables"]["group_members"]["Update"];
export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationUpdate =
  Database["public"]["Tables"]["notifications"]["Update"];
export type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];
export type FeedbackInsert = Database["public"]["Tables"]["feedback"]["Insert"];
export type PostImageRow = Database["public"]["Tables"]["post_images"]["Row"];
export type PostImageInsert =
  Database["public"]["Tables"]["post_images"]["Insert"];
export type FeedPostRow = Database["public"]["Views"]["feed_posts"]["Row"];
export type PushTokenRow = Database["public"]["Tables"]["push_tokens"]["Row"];
export type PushTokenInsert =
  Database["public"]["Tables"]["push_tokens"]["Insert"];
export type PushTokenUpdate =
  Database["public"]["Tables"]["push_tokens"]["Update"];
export type PushSettingsRow =
  Database["public"]["Tables"]["push_settings"]["Row"];
export type PushSettingsInsert =
  Database["public"]["Tables"]["push_settings"]["Insert"];
export type PushSettingsUpdate =
  Database["public"]["Tables"]["push_settings"]["Update"];
