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
    };
    Views: { [_ in never]: never };
    Functions: {
      /** Deletes the calling user's auth account and, by cascade, their data. */
      delete_own_account: {
        Args: never;
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
