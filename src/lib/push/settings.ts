import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { isPushAvailable } from "@/lib/push/flag";
import { useAuth } from "@/lib/auth/use-auth";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

/**
 * Per-user push settings: the master switch and one switch per notification
 * kind, stored in `push_settings`. A missing row means everything is on, so
 * the defaults here and on the server agree. Every hook is disabled unless
 * push is available (flag on, native app), so a flag-off build never touches
 * the table.
 */

/** The per-kind switches, in display order. */
export const PUSH_SETTING_KINDS = [
  "likes",
  "comments",
  "follows",
  "groups",
  "messages",
] as const;

export type PushSettingKind = (typeof PUSH_SETTING_KINDS)[number];

/** Every switch the settings card shows. */
export interface PushSettings {
  /** The master switch; off stops every push. */
  enabled: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  groups: boolean;
  messages: boolean;
}

/** Everything on: what a missing `push_settings` row means. */
export const DEFAULT_PUSH_SETTINGS: PushSettings = {
  enabled: true,
  likes: true,
  comments: true,
  follows: true,
  groups: true,
  messages: true,
};

/**
 * The settings a `push_settings` row means. A missing or malformed row means
 * everything is on; a partially malformed row keeps its boolean fields and
 * defaults the rest.
 */
export function normalizePushSettings(row: unknown): PushSettings {
  if (typeof row !== "object" || row === null) {
    return { ...DEFAULT_PUSH_SETTINGS };
  }
  const record = row as Record<string, unknown>;
  const pick = (key: keyof PushSettings): boolean =>
    typeof record[key] === "boolean"
      ? (record[key] as boolean)
      : DEFAULT_PUSH_SETTINGS[key];
  return {
    enabled: pick("enabled"),
    likes: pick("likes"),
    comments: pick("comments"),
    follows: pick("follows"),
    groups: pick("groups"),
    messages: pick("messages"),
  };
}

const SETTINGS_COLUMNS =
  "user_id, enabled, likes, comments, follows, groups, messages";

/** Reads my push settings; a missing row (or a failed read) means all on. */
export async function readPushSettings(
  client: AppSupabaseClient | null,
  userId: string,
): Promise<PushSettings> {
  if (!client || userId === "") return { ...DEFAULT_PUSH_SETTINGS };
  const { data, error } = await client
    .from("push_settings")
    .select(SETTINGS_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ...DEFAULT_PUSH_SETTINGS };
  return normalizePushSettings(data);
}

/** Writes my push settings, creating the row on first change. */
export async function writePushSettings(
  client: AppSupabaseClient | null,
  userId: string,
  settings: PushSettings,
): Promise<boolean> {
  if (!client || userId === "") return false;
  const { error } = await client.from("push_settings").upsert({
    user_id: userId,
    enabled: settings.enabled,
    likes: settings.likes,
    comments: settings.comments,
    follows: settings.follows,
    groups: settings.groups,
    messages: settings.messages,
  });
  return error === null;
}

/** My push settings. Disabled (and never queried) unless push is available. */
export function usePushSettings(client: AppSupabaseClient | null = supabase) {
  const { user } = useAuth();
  return useQuery<PushSettings>({
    queryKey: ["push", "settings", user?.id ?? null],
    enabled: isPushAvailable() && client !== null && user !== null,
    retry: false,
    // Own settings: the switch mutations invalidate this key, so the
    // staleTime only serves revisits.
    staleTime: 10 * 60_000,
    queryFn: () => readPushSettings(client, user!.id),
  });
}

/** Snapshots restored when an optimistic settings write is refused. */
export interface PushSettingsSnapshot {
  snapshots: Array<[QueryKey, unknown]>;
}

/**
 * Updates my push settings. Every switch flips optimistically and rolls back
 * when the write fails.
 */
export function useUpdatePushSettings(
  client: AppSupabaseClient | null = supabase,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, PushSettings, PushSettingsSnapshot>({
    mutationFn: async (settings: PushSettings): Promise<boolean> => {
      if (!isPushAvailable() || !client || !user) return false;
      return writePushSettings(client, user.id, settings);
    },
    onMutate: (settings) => {
      if (!isPushAvailable() || !client || !user || !settings) {
        return { snapshots: [] };
      }
      const snapshots = queryClient.getQueriesData({
        queryKey: ["push", "settings"],
      });
      for (const [key] of snapshots) {
        queryClient.setQueryData(key, settings);
      }
      return { snapshots };
    },
    onSuccess: (saved, _settings, context) => {
      if (!saved) {
        // The write did not go through: the switches flip back.
        for (const [key, data] of context?.snapshots ?? []) {
          queryClient.setQueryData(key, data);
        }
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["push", "settings"] });
    },
    onError: (_error, _settings, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
  });
}
