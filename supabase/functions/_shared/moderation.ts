/**
 * Decision logic for the image-screening Edge Functions.
 *
 * PURE MODULE: no Deno globals, no URL imports, no fetch, no supabase-js.
 * Vitest loads it in jsdom (moderation.test.ts, picked up by vite.config.ts)
 * and the Edge Functions import it from "../_shared/moderation.ts".
 *
 * It turns a moderation API response into the two things the screening
 * function needs: which post_images.status to set, and which
 * moderation_actions / notifications rows to write. The functions own all
 * I/O (fetch, storage, database); everything here is data in, data out.
 */

/** Values of post_images.status (20261119160000_image_posts.sql). */
export type ImageStatus = "pending" | "approved" | "rejected" | "blocked";

/** moderation_actions.reason when the OpenAI moderation API flags an image. */
export const AUTOMATIC_SCREENING_REASON = "Automatic image screening";

/** moderation_actions.reason when the warm-up fetch returns 451. */
export const ABUSE_MATCH_REASON = "Matched known abuse material";

/** post_images.screen_result is capped at 8 KiB serialized (migration). */
export const SCREEN_RESULT_MAX_BYTES = 8192;

/**
 * Quarantined files are kept this long (owner decision, 2026-11-18), the
 * same 12 months as purge_moderation_records keeps the moderation records.
 */
export const QUARANTINE_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

/** What the OpenAI moderation model said about one image. */
export interface ModerationOutcome {
  /** True when the model flagged the image. */
  flagged: boolean;
  /** Every category key the model reported; true when flagged for it. */
  categories: Record<string, boolean>;
  /** Every score the model reported. */
  categoryScores: Record<string, number>;
}

export type ParsedModeration =
  { ok: true; outcome: ModerationOutcome } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses an OpenAI moderation API response (omni-moderation-latest). Never
 * throws: any shape the screening must not trust comes back as
 * { ok: false, error }, and the caller leaves the image pending and returns
 * a retryable 503. Never approve without a result.
 */
export function parseModerationResponse(body: unknown): ParsedModeration {
  if (!isRecord(body)) {
    return { ok: false, error: "response is not an object" };
  }
  const results = body.results;
  if (!Array.isArray(results) || results.length === 0) {
    return { ok: false, error: "results is missing or empty" };
  }
  const categories: Record<string, boolean> = {};
  const categoryScores: Record<string, number> = {};
  let flagged = false;
  for (const [index, entry] of results.entries()) {
    if (!isRecord(entry)) {
      return { ok: false, error: `results[${index}] is not an object` };
    }
    if (typeof entry.flagged !== "boolean") {
      return { ok: false, error: `results[${index}].flagged is not a boolean` };
    }
    flagged = flagged || entry.flagged;
    const entryCategories = entry.categories;
    if (entryCategories !== undefined) {
      if (!isRecord(entryCategories)) {
        return {
          ok: false,
          error: `results[${index}].categories is not an object`,
        };
      }
      for (const [key, value] of Object.entries(entryCategories)) {
        if (typeof value !== "boolean") {
          return {
            ok: false,
            error: `results[${index}].categories.${key} is not a boolean`,
          };
        }
        categories[key] = categories[key] === true || value;
      }
    }
    const entryScores = entry.category_scores;
    if (entryScores !== undefined) {
      if (!isRecord(entryScores)) {
        return {
          ok: false,
          error: `results[${index}].category_scores is not an object`,
        };
      }
      for (const [key, value] of Object.entries(entryScores)) {
        if (typeof value !== "number" || Number.isNaN(value)) {
          return {
            ok: false,
            error: `results[${index}].category_scores.${key} is not a number`,
          };
        }
        const previous = categoryScores[key];
        categoryScores[key] =
          previous === undefined ? value : Math.max(previous, value);
      }
    }
  }
  return { ok: true, outcome: { flagged, categories, categoryScores } };
}

function serializedBytes(value: Record<string, unknown>): number {
  // Keys are ASCII ("flagged", "categories", ...), so string length is byte
  // length for the parts this module builds.
  return JSON.stringify(value)?.length ?? 0;
}

/**
 * The JSON stored in post_images.screen_result: what the screening found,
 * compacted to fit the 8 KiB column cap. category_scores is dropped first,
 * then categories; `flagged` is always kept.
 */
export function screenResultFor(
  outcome: ModerationOutcome,
): Record<string, unknown> {
  const candidates: Record<string, unknown>[] = [
    {
      flagged: outcome.flagged,
      categories: outcome.categories,
      category_scores: outcome.categoryScores,
    },
    { flagged: outcome.flagged, categories: outcome.categories },
    { flagged: outcome.flagged },
  ];
  for (const candidate of candidates) {
    if (serializedBytes(candidate) <= SCREEN_RESULT_MAX_BYTES) {
      return candidate;
    }
  }
  return { flagged: outcome.flagged };
}

/** The screening verdict: a flagged image is rejected, a clean one approved. */
export function decideScreening(
  outcome: ModerationOutcome,
): "approved" | "rejected" {
  return outcome.flagged ? "rejected" : "approved";
}

/**
 * The warm-up fetch through img.ohkolab.com returns 451 when Cloudflare's
 * CSAM Scanning Tool matched the image against known abuse material.
 */
export function isBlockedWarmupStatus(status: number): boolean {
  return status === 451;
}

export interface ModerationRecordInput {
  postId: string;
  authorId: string;
  /** The image's storage paths (pending copy, plus the public copy for a 451). */
  mediaPaths: string[];
  /** AUTOMATIC_SCREENING_REASON or ABUSE_MATCH_REASON. */
  reason: string;
}

/**
 * The moderation_actions row a rejected or blocked image gets. Mirrors
 * remove_post_with_reason()'s 'post'/'remove'/'post' shape, minus the fields
 * only a human moderator can supply (report_id, moderator_id,
 * content_snapshot).
 */
export function buildModerationRecord({
  postId,
  authorId,
  mediaPaths,
  reason,
}: ModerationRecordInput): Record<string, unknown> {
  return {
    target_type: "post",
    target_id: postId,
    target_user_id: authorId,
    action: "remove",
    reason,
    content_kind: "post",
    media_paths: mediaPaths,
  };
}

export interface ModerationNotificationInput {
  /** The affected user, or (for a 451) each admin. */
  recipientId: string;
  postId: string;
  actionId: string;
}

/**
 * The notifications row a moderation action sends. The SQL moderation
 * functions pass the moderator as actor; an automated screening has no
 * human actor, so actor_id is null (the column allows it). post_id and
 * moderation_action_id follow remove_post_with_reason().
 */
export function buildModerationNotification({
  recipientId,
  postId,
  actionId,
}: ModerationNotificationInput): Record<string, unknown> {
  return {
    recipient_id: recipientId,
    actor_id: null,
    type: "moderation",
    post_id: postId,
    moderation_action_id: actionId,
  };
}

/** One file in post-images-quarantine, as the cleanup function sees it. */
export interface QuarantineFile {
  path: string;
  /** When the file was moved to quarantine; NaN when storage did not say. */
  lastModifiedMs: number;
}

/**
 * Storage files whose post_images row is gone: neither a live row's path nor
 * a path a moderation record still lists. `protectedPaths` are the
 * media_paths of live moderation_actions rows: the cleanup run moves those
 * files to quarantine before consulting this, and if a move failed the
 * file must not be deleted either - it is evidence.
 */
export function selectOrphanPaths(
  paths: string[],
  knownPaths: ReadonlySet<string>,
  protectedPaths: ReadonlySet<string>,
): string[] {
  return paths.filter(
    (path) => !knownPaths.has(path) && !protectedPaths.has(path),
  );
}

/**
 * Quarantined files safe to delete: older than the retention period and no
 * longer listed by any moderation_actions.media_paths. The records
 * themselves are purged after the same 12 months by
 * purge_moderation_records, so an unlisted file of that age is an orphan.
 * Files with an unknown age are kept.
 */
export function selectPurgeableQuarantine(
  files: QuarantineFile[],
  listedPaths: ReadonlySet<string>,
  nowMs: number,
  retentionMs: number = QUARANTINE_RETENTION_MS,
): string[] {
  return files
    .filter(
      (file) =>
        Number.isFinite(file.lastModifiedMs) &&
        nowMs - file.lastModifiedMs >= retentionMs &&
        !listedPaths.has(file.path),
    )
    .map((file) => file.path);
}
