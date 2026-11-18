/**
 * cleanup-images (Deno Edge Function): the storage janitor (every 15 minutes) for image
 * posts. SQL cannot move or delete storage objects, so this function owns
 * every file-level consequence of the image schema:
 *
 *   1. files whose post_images row is gone (deleted accounts or posts)
 *      are deleted - except files already in quarantine
 *   2. files listed in moderation_actions.media_paths are moved to
 *      post-images-quarantine (pending and public copies alike), and the
 *      public copy disappears
 *   3. quarantined files older than 12 months are deleted once no
 *      moderation record lists them any more; purge_moderation_records
 *      deletes the records themselves after the same period
 *
 * Scheduled every 15 minutes by the Claude reviewer (the pg_cron pattern from
 * 20261119150000_moderation_purge.sql cannot call Edge Functions). The
 * caller must present the service role key in the Authorization header.
 */
import {
  QUARANTINE_RETENTION_MS,
  selectOrphanPaths,
  selectPurgeableQuarantine,
} from "../_shared/moderation.ts";
import { selectAll, serviceClient } from "../_shared/supabase.ts";
import {
  PENDING_BUCKET,
  PUBLIC_BUCKET,
  QUARANTINE_BUCKET,
  listAllFiles,
  moveToQuarantine,
  removeFile,
} from "../_shared/storage.ts";

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Only the scheduler (or an owner) with the service role key may run
  // this: it deletes files. Deploy with JWT verification OFF; the check
  // here is the authorization.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  if (!serviceKey || authorization !== `Bearer ${serviceKey}`) {
    return json(401, { error: "Unauthorized" });
  }

  const db = serviceClient();
  const summary = {
    movedToQuarantine: 0,
    deletedOrphanFiles: 0,
    purgedQuarantineFiles: 0,
    errors: [] as string[],
  };
  const note = (message: string) => {
    summary.errors.push(message);
    console.error(message);
  };

  // Paths a live post_images row still owns, per bucket.
  const pendingPaths = new Set<string>();
  const publicPaths = new Set<string>();
  try {
    await selectAll<{ pending_path: string; public_path: string | null }>(
      db,
      "post_images",
      "pending_path,public_path",
      (row) => {
        pendingPaths.add(row.pending_path);
        if (row.public_path) publicPaths.add(row.public_path);
      },
    );
  } catch (error) {
    note(`post_images read failed: ${error}`);
  }

  // Paths a live moderation record still lists. These are evidence: they
  // are moved to quarantine, never deleted, and stay there until the
  // record is purged after 12 months.
  const listedPaths = new Set<string>();
  try {
    await selectAll<{ media_paths: string[] | null }>(
      db,
      "moderation_actions",
      "media_paths",
      (row) => {
        for (const path of row.media_paths ?? []) listedPaths.add(path);
      },
    );
  } catch (error) {
    note(`moderation_actions read failed: ${error}`);
  }

  // 1. Move listed files still sitting in the public or pending bucket to
  // quarantine (the blocked status already hides them from the feed; this
  // takes the bytes away too). One path string can have a copy in both
  // buckets, so both are checked.
  for (const path of listedPaths) {
    for (const bucket of [PUBLIC_BUCKET, PENDING_BUCKET]) {
      try {
        const result = await moveToQuarantine(db, bucket, path);
        if (result === "moved") summary.movedToQuarantine += 1;
        if (result === "error") {
          note(`could not move ${bucket}/${path} to quarantine`);
        }
      } catch (error) {
        note(`could not move ${bucket}/${path}: ${error}`);
      }
    }
  }

  // 2. Delete files whose post_images row is gone. Files a moderation
  // record still lists are never deleted here: step 1 just moved them,
  // and if a move failed the file is evidence and must stay.
  const buckets: Array<[bucket: string, known: Set<string>]> = [
    [PENDING_BUCKET, pendingPaths],
    [PUBLIC_BUCKET, publicPaths],
  ];
  for (const [bucket, known] of buckets) {
    try {
      const files = await listAllFiles(db, bucket);
      const orphans = selectOrphanPaths(
        files.map((file) => file.path),
        known,
        listedPaths,
      );
      for (const path of orphans) {
        if (await removeFile(db, bucket, path)) {
          summary.deletedOrphanFiles += 1;
        } else {
          note(`could not delete ${bucket}/${path}`);
        }
      }
    } catch (error) {
      note(`${bucket} listing failed: ${error}`);
    }
  }

  // 3. Delete quarantined files older than 12 months that no live
  // moderation record lists any more. purge_moderation_records deletes
  // the records after the same period, so an unlisted file of that age
  // is an orphan.
  try {
    const quarantined = await listAllFiles(db, QUARANTINE_BUCKET);
    const now = Date.now();
    const purgeable = selectPurgeableQuarantine(
      quarantined,
      listedPaths,
      now,
      QUARANTINE_RETENTION_MS,
    );
    for (const path of purgeable) {
      if (await removeFile(db, QUARANTINE_BUCKET, path)) {
        summary.purgedQuarantineFiles += 1;
      } else {
        note(`could not purge ${QUARANTINE_BUCKET}/${path}`);
      }
    }
  } catch (error) {
    note(`${QUARANTINE_BUCKET} listing failed: ${error}`);
  }

  return json(200, summary);
});
