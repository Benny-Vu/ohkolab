/**
 * Reading shareable content from Supabase — through the anon role only.
 *
 * Every query here carries the anon key and nothing else, so row-level
 * security decides what exists:
 *
 *  - profiles: readable to everyone;
 *  - teams: only `is_public` rows;
 *  - posts: only posts that are not removed, whose author is not
 *    suspended, and that are on the main feed or in a public group
 *    (invite-only group posts simply do not come back);
 *  - post_images: only `status = 'approved'` images of readable posts;
 *  - groups: all rows, but only their visibility is read.
 *
 * The functions never throw: unreadable, malformed or failing responses
 * all become null, and the card builders turn null into the generic card.
 * Parsing is split into pure `parse*` functions that validate every field
 * before it is trusted (the database only checks that jsonb columns are
 * shaped, not that their content is valid — see the app's
 * database.types.ts).
 */

import type { PostData, ProfileData, TeamData } from "./cards";

/** The anon-key REST access the Worker is allowed to use. */
export interface SupabaseConfig {
  url: string;
  /** The public anon key. Never a service_role key. */
  anonKey: string;
}

/**
 * The subset of `fetch` the queries need. The Workers runtime's global
 * fetch satisfies this; tests inject a stub.
 */
export interface FetchLike {
  (
    input: string,
    init?: { headers: Record<string, string> },
  ): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
}

/** A single Supabase REST table row, already JSON-parsed. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** GETs one PostgREST table. Returns null on any error or empty body. */
async function restGet(
  config: SupabaseConfig,
  fetcher: FetchLike,
  table: string,
  params: string,
): Promise<unknown> {
  const url = `${config.url}/rest/v1/${table}?${params}`;
  try {
    const response = await fetcher(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Row parsers (pure)
// ---------------------------------------------------------------------------

/** A profiles row → ProfileData, or null when the shape is wrong. */
export function parseProfileRow(value: unknown): ProfileData | null {
  if (!isRecord(value)) return null;
  const username = asString(value.username);
  if (!username) return null;
  return {
    username,
    displayName: asString(value.display_name),
    avatarSpecies: asString(value.avatar_species),
    bio: asString(value.bio),
  };
}

/**
 * A teams row → TeamData, or null when the shape is wrong or the team is
 * private. `is_public` is re-checked here even though the anon query can
 * only return public rows: if a policy ever widens, the card still fails
 * closed.
 */
export function parseTeamRow(value: unknown): TeamData | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;
  if (value.is_public !== true) return null;
  const data = value.data;
  if (!Array.isArray(data)) return null;
  const species: string[] = [];
  for (const member of data) {
    if (!isRecord(member)) return null;
    const name2 = asString(member.species);
    if (!name2) return null;
    species.push(name2);
  }
  return { id, name, isPublic: true, species };
}

/** The fields of a posts row the card needs. */
export interface PostRow {
  id: string;
  body: string;
  attachment: unknown;
  groupId: string | null;
  authorId: string | null;
}

/** A posts row → PostRow, or null when the shape is wrong. */
export function parsePostRow(value: unknown): PostRow | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const body = asString(value.body);
  if (!id || !body) return null;
  return {
    id,
    body,
    attachment: value.attachment ?? null,
    groupId: asString(value.group_id),
    authorId: asString(value.author_id),
  };
}

/**
 * The species names of a post's team attachment, or null when the post
 * has no team attachment. Attachments are snapshots (see the app's
 * features/feed/attachment.ts): a team snapshot has no team id, which is
 * why the post card renders its image from the post itself.
 */
export function parseTeamAttachmentSpecies(value: unknown): string[] | null {
  if (!isRecord(value) || value.kind !== "team") return null;
  const members = value.members;
  if (!Array.isArray(members) || members.length === 0) return null;
  const species: string[] = [];
  for (const member of members) {
    if (!isRecord(member)) return null;
    const name = asString(member.species);
    if (!name) return null;
    species.push(name);
  }
  return species;
}

/**
 * The public CDN path of an approved post image row, or null. Rows with
 * any other status already cannot come back through the anon role (the
 * post_images select policy allows only `status = 'approved'`), but the
 * status is re-checked so the card never shows a pending or rejected
 * image even if a policy ever widens.
 */
export function parseApprovedImagePath(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (value.status !== "approved") return null;
  return asString(value.public_path);
}

/** A groups row → its visibility, or null when the shape is wrong. */
export function parseGroupVisibility(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return asString(value.visibility);
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/** Reads a profile by username. Null when there is no such profile. */
export async function fetchProfile(
  config: SupabaseConfig,
  fetcher: FetchLike,
  username: string,
): Promise<ProfileData | null> {
  const rows = await restGet(
    config,
    fetcher,
    "profiles",
    `select=username,display_name,avatar_species,bio&username=eq.${encodeURIComponent(username)}`,
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return parseProfileRow(rows[0]);
}

/** Reads the author's display name / @username for a profile id. */
async function fetchAuthorName(
  config: SupabaseConfig,
  fetcher: FetchLike,
  authorId: string,
): Promise<string | null> {
  const rows = await restGet(
    config,
    fetcher,
    "profiles",
    `select=username,display_name&id=eq.${encodeURIComponent(authorId)}`,
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const profile = parseProfileRow(rows[0]);
  if (!profile) return null;
  return profile.displayName || `@${profile.username}`;
}

/** Reads a team by id. Null when it is missing, private or malformed. */
export async function fetchTeam(
  config: SupabaseConfig,
  fetcher: FetchLike,
  id: string,
): Promise<TeamData | null> {
  const rows = await restGet(
    config,
    fetcher,
    "teams",
    `select=id,name,is_public,data&id=eq.${encodeURIComponent(id)}`,
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return parseTeamRow(rows[0]);
}

/**
 * Reads everything a post card needs: the post, its author's name, the
 * group's visibility (fail-closed to a non-public value when the group
 * row is unreadable), the attached team's species and the first approved
 * image's path. Null when the post itself is unreadable — which is what
 * removed posts, posts of suspended authors and invite-only group posts
 * already are to the anon role.
 */
export async function fetchPostData(
  config: SupabaseConfig,
  fetcher: FetchLike,
  id: string,
): Promise<PostData | null> {
  const posts = await restGet(
    config,
    fetcher,
    "posts",
    `select=id,body,attachment,group_id,author_id&id=eq.${encodeURIComponent(id)}`,
  );
  if (!Array.isArray(posts) || posts.length === 0) return null;
  const post = parsePostRow(posts[0]);
  if (!post) return null;

  const authorName = post.authorId
    ? await fetchAuthorName(config, fetcher, post.authorId)
    : null;

  let groupVisibility: string | null = null;
  if (post.groupId) {
    const groups = await restGet(
      config,
      fetcher,
      "groups",
      `select=visibility&id=eq.${encodeURIComponent(post.groupId)}`,
    );
    // Fail closed: an unreadable group row must never read as public.
    groupVisibility =
      Array.isArray(groups) && groups.length > 0
        ? (parseGroupVisibility(groups[0]) ?? "unknown")
        : "unknown";
  }

  const images = await restGet(
    config,
    fetcher,
    "post_images",
    `select=public_path,status&post_id=eq.${encodeURIComponent(post.id)}&order=position.asc&limit=1`,
  );
  const approvedImagePath =
    Array.isArray(images) && images.length > 0
      ? parseApprovedImagePath(images[0])
      : null;

  return {
    id: post.id,
    body: post.body,
    authorName,
    groupVisibility,
    teamSpecies: parseTeamAttachmentSpecies(post.attachment),
    approvedImagePath,
  };
}
