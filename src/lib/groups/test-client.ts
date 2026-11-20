/**
 * Test-only helpers for the groups layer tests: the shared fake Supabase
 * client from `@/test/fake-supabase` (its chain records `ilike` filters for
 * the Discover search) plus the row factories the groups tests build
 * fixtures with. Nothing in the app imports this file.
 */

export {
  createFakeClient,
  createQueryClient,
  createWrapper,
  expectFailed,
  runMutation,
  SIGNED_IN_AUTH,
} from "@/test/fake-supabase";
export type {
  ChainRecord,
  FakeClientConfig,
  FakeResult,
} from "@/test/fake-supabase";

import type {
  GroupMemberRow,
  GroupRow,
  ProfileRow,
} from "@/lib/database.types";

export function groupRow(
  partial: Partial<GroupRow> & { id: string },
): GroupRow {
  return {
    slug: "test-group",
    name: "Test Group",
    description: "A group for testing.",
    visibility: "public",
    category: null,
    language: null,
    owner_id: "user-1",
    created_at: "2026-11-18T10:00:00.000Z",
    updated_at: "2026-11-18T10:00:00.000Z",
    ...partial,
  };
}

export function groupMemberRow(
  partial: Partial<GroupMemberRow> & {
    groupId: string;
    userId: string;
  },
): GroupMemberRow {
  return {
    group_id: partial.groupId,
    user_id: partial.userId,
    role: "member",
    status: "active",
    created_at: "2026-11-18T10:00:00.000Z",
    ...partial,
  };
}

export function profileRow(
  partial: Partial<ProfileRow> & { id: string },
): ProfileRow {
  return {
    username: "trainer",
    display_name: "Trainer",
    avatar_species: "Garchomp",
    bio: null,
    favourite_species: null,
    main_format: null,
    looking_for: null,
    youtube_url: null,
    twitch_url: null,
    showdown_name: null,
    created_at: "2026-11-17T10:00:00.000Z",
    updated_at: "2026-11-17T10:00:00.000Z",
    ...partial,
  };
}
