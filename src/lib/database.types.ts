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
          reporter_id: string;
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
          user_id: string;
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
export type FeedPostRow = Database["public"]["Views"]["feed_posts"]["Row"];
