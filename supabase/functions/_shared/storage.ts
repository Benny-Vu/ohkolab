/**
 * Storage helpers for the image Edge Functions (Deno).
 *
 * The three buckets come from 20261119160000_image_posts.sql. SQL cannot
 * move or delete storage objects, so these wrappers are how images move
 * between buckets:
 *   post-images-pending    the author's upload
 *   post-images             approved, public (served via img.ohkolab.com)
 *   post-images-quarantine  rejected / removed, moderators only
 * Every path keeps its shape {uid}/{post_id}/{image_id}.webp in all three.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const PENDING_BUCKET = "post-images-pending";
export const PUBLIC_BUCKET = "post-images";
export const QUARANTINE_BUCKET = "post-images-quarantine";

/** One file in a bucket, as the cleanup function needs it. */
export interface StorageFile {
  path: string;
  /** When the file was last modified; NaN when storage did not say. */
  lastModifiedMs: number;
}

export type MoveResult = "moved" | "absent" | "error";

/**
 * Encodes bytes as base64 in chunks: spreading the whole array into
 * String.fromCharCode would blow the stack on a 1 MB image.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Copies a file from one bucket to another at the same path, replacing any
 * copy already there (delete first: the storage copy call fails on an
 * existing destination, and both call sites need retries to be safe).
 */
export async function copyAcrossBuckets(
  db: SupabaseClient,
  fromBucket: string,
  toBucket: string,
  path: string,
): Promise<boolean> {
  const { error } = await db.storage
    .from(fromBucket)
    .copy(path, path, { destinationBucket: toBucket });
  return !error;
}

/** Deletes a file; a missing file is not an error (retries must be safe). */
export async function removeFile(
  db: SupabaseClient,
  bucket: string,
  path: string,
): Promise<boolean> {
  const { error } = await db.storage.from(bucket).remove([path]);
  return !error;
}

/**
 * Whether a file exists. Uses a name search inside the parent folder rather
 * than a download, so the cleanup function can probe cheaply. A failed
 * probe counts as absent: callers then skip the file and retry next run.
 */
export async function fileExists(
  db: SupabaseClient,
  bucket: string,
  path: string,
): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const folder = slash === -1 ? "" : path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await db.storage
    .from(bucket)
    .list(folder, { search: name, limit: 100 });
  if (error) return false;
  return (data ?? []).some((entry) => entry.name === name);
}

/**
 * Moves a file to post-images-quarantine at the same path: copy, then
 * delete the source. "absent" means there was nothing to move; "error"
 * means the move failed and the file is still where it was, so the next
 * daily run can try again.
 */
export async function moveToQuarantine(
  db: SupabaseClient,
  fromBucket: string,
  path: string,
): Promise<MoveResult> {
  if (!(await fileExists(db, fromBucket, path))) return "absent";
  // Replace any earlier quarantine copy so a half-finished previous run
  // cannot leave this one stuck, but never delete the quarantine copy
  // without being able to recreate it: the copy below only runs when the
  // source exists (checked above).
  if (!(await copyAcrossBuckets(db, fromBucket, QUARANTINE_BUCKET, path))) {
    return "error";
  }
  const removed = await removeFile(db, fromBucket, path);
  return removed ? "moved" : "error";
}

/**
 * Lists every file in a bucket, walking the {uid}/{post_id}/ folders
 * recursively. Folder entries come back from list() with a null id and
 * null metadata; files always have both. A mislabelled file would simply be
 * listed again one level down (and find nothing), so erring towards
 * "folder" only skips a file - the safe direction for a deleter.
 */
export async function listAllFiles(
  db: SupabaseClient,
  bucket: string,
  folder = "",
): Promise<StorageFile[]> {
  const files: StorageFile[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.storage
      .from(bucket)
      .list(folder, { limit: pageSize, offset });
    if (error) throw new Error(`${bucket} list failed: ${error.message}`);
    for (const entry of data ?? []) {
      if (entry.name === "" || entry.name === "." || entry.name === "..") {
        continue;
      }
      const childPath = folder ? `${folder}/${entry.name}` : entry.name;
      if (entry.id === null || entry.metadata === null) {
        files.push(...(await listAllFiles(db, bucket, childPath)));
      } else {
        // storage-js types the field lastModified, but older storage
        // versions sent last_modified; accept either.
        const metadata = entry.metadata as Record<string, unknown>;
        const lastModified = metadata.lastModified ?? metadata.last_modified;
        files.push({
          path: childPath,
          lastModifiedMs:
            typeof lastModified === "string" ? Date.parse(lastModified) : NaN,
        });
      }
    }
    if ((data ?? []).length < pageSize) return files;
  }
}
