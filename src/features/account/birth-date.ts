import { useQuery } from "@tanstack/react-query";

import { directMessagesEnabled } from "@/lib/messages/flag";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

/**
 * The user's birth date, asked once (owner decision, 2026-11-18): at sign-up
 * for new players, as a dismissible prompt for existing ones. It is used
 * only to decide whether a player is an adult, is never shown publicly, and
 * lives in its own table that only the owner can read. Everything here is
 * behind VITE_DIRECT_MESSAGES: with the flag off there is no field, no
 * prompt and no query — the table may not even exist yet.
 */

/** localStorage key remembering a dismissed prompt (per browser). */
export const DISMISSED_KEY = "ohkolab.birth-date-dismissed";

/** The smallest age allowed on the platform; under 18 is a "minor". */
export const MINIMUM_AGE = 16;

export interface BirthDateResult {
  ok: boolean;
  /** The server's sentence when saving failed. */
  message?: string;
}

/** Saves the signed-in user's birth date through the RPC (server checks too). */
export async function setBirthDate(
  client: AppSupabaseClient,
  birthDate: string,
): Promise<BirthDateResult> {
  const { error } = await client.rpc("set_birth_date", {
    new_birth_date: birthDate,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * The signed-in user's own birth date (yyyy-mm-dd), or null when they have
 * none. Undefined while loading or when the flag is off. With the flag off
 * the query never runs, so the app makes no requests to the table.
 */
export function useBirthDate(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  const enabled = directMessagesEnabled() && client !== null && !!user;
  return useQuery({
    queryKey: ["birth-date", user?.id ?? null],
    enabled,
    queryFn: async () => {
      const { data, error } = await client!
        .from("profile_birth_dates")
        .select("birth_date")
        .eq("user_id", user!.id)
        .maybeSingle();
      // Fail soft: a missing row and an unreadable table look the same.
      if (error) return null;
      return data?.birth_date ?? null;
    },
    staleTime: Infinity,
  });
}

type Translator = ReturnType<typeof useT>;

/** Validates a yyyy-mm-dd birth date; returns a message or null. */
export function validateBirthDate(value: string, t: Translator): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return t("birthDate.invalid");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return t("birthDate.invalid");
  }
  const today = new Date();
  if (date.getTime() > today.getTime()) {
    return t("birthDate.invalid");
  }
  const minimum = new Date(today);
  minimum.setUTCFullYear(minimum.getUTCFullYear() - MINIMUM_AGE);
  if (date.getTime() > minimum.getTime()) {
    return t("birthDate.tooYoung");
  }
  return null;
}
