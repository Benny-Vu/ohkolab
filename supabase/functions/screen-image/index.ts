/**
 * screen-image (Deno Edge Function): screens a freshly uploaded post image.
 *
 * The client calls this right after uploading, with the post_images id in
 * the body ({ imageId }) and the author's token in the Authorization
 * header. Deploy with JWT verification ON (the default): the platform
 * checks the token, and the function additionally refuses to screen for
 * anyone but the image's author.
 *
 * Steps (see 20261119160000_image_posts.sql for the schema):
 *   1. download the file from post-images-pending at the row's pending_path
 *   2. send it to OpenAI's moderation API (omni-moderation-latest) as a
 *      base64 data URL; the key is the OPENAI_API_KEY secret
 *   3. flagged: mark the row rejected, store the result in screen_result,
 *      move the file to post-images-quarantine, record a moderation_actions
 *      row and notify the author
 *   4. clean: copy the file to the public post-images bucket at the same
 *      path, mark the row approved with public_path and screened_at, then
 *      fetch it once through img.ohkolab.com so Cloudflare caches it and its
 *      CSAM Scanning Tool checks it
 *   5. a 451 from that fetch means the scanner matched known abuse
 *      material: mark the row blocked, move the file to quarantine, delete
 *      the public copy, record the action and notify every admin. The
 *      owner then follows the written CSAM procedure (disable the account,
 *      lock the evidence, report to the police) - outside this function.
 *
 * On any error (OpenAI down, timeout, storage failure) the image stays
 * pending and the response is a retryable 503. Never approve without a
 * result.
 */
import { fetchWithTimeout } from "../_shared/http.ts";
import {
  ABUSE_MATCH_REASON,
  AUTOMATIC_SCREENING_REASON,
  buildModerationNotification,
  buildModerationRecord,
  decideScreening,
  isBlockedWarmupStatus,
  parseModerationResponse,
  screenResultFor,
} from "../_shared/moderation.ts";
import { serviceClient, userFromRequest } from "../_shared/supabase.ts";
import {
  PENDING_BUCKET,
  PUBLIC_BUCKET,
  bytesToBase64,
  copyAcrossBuckets,
  moveToQuarantine,
  removeFile,
} from "../_shared/storage.ts";

const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";
/** The Cloudflare Worker (workers/img/) that fronts the public bucket. */
const IMG_HOST = "https://img.ohkolab.com";
const OPENAI_TIMEOUT_MS = 30_000;
const WARMUP_TIMEOUT_MS = 15_000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The columns screen-image reads and decides on. */
interface PostImageRow {
  id: string;
  post_id: string;
  author_id: string;
  /** {uid}/{post_id}/{image_id}.webp - the same in every bucket. */
  pending_path: string;
  public_path: string | null;
  status: string;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Leave the image pending; the client may try again. */
function retryable(error: string): Response {
  return json(503, { error, retryable: true });
}

Deno.serve(async (req) => {
  // The platform verified the JWT; confirm which user it belongs to.
  const user = await userFromRequest(req);
  if (!user) return json(401, { error: "Not signed in" });

  let imageId: unknown;
  try {
    imageId = (await req.json())?.imageId;
  } catch {
    imageId = undefined;
  }
  if (typeof imageId !== "string" || !UUID_RE.test(imageId)) {
    return json(400, { error: "imageId is required" });
  }

  const db = serviceClient();
  const { data: image, error: rowError } = await db
    .from("post_images")
    .select("id, post_id, author_id, pending_path, public_path, status")
    .eq("id", imageId)
    .maybeSingle();
  if (rowError) return retryable("Could not read the image row");
  if (!image) return json(404, { error: "Unknown image" });
  const row = image as PostImageRow;
  if (row.author_id !== user.id) {
    return json(403, { error: "Not the image's author" });
  }
  if (row.status !== "pending") {
    // Already screened, or a moderator removed the post (its images were
    // marked blocked). Nothing to do either way.
    return json(409, { error: "Image already screened", status: row.status });
  }

  // 1. The uploaded file.
  const { data: file, error: downloadError } = await db.storage
    .from(PENDING_BUCKET)
    .download(row.pending_path);
  if (downloadError || !file) {
    return retryable("Could not read the uploaded file");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());

  // 2. OpenAI moderation.
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) return retryable("OPENAI_API_KEY is not set");
  let response: Response;
  try {
    response = await fetchWithTimeout(OPENAI_MODERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/webp;base64,${bytesToBase64(bytes)}`,
            },
          },
        ],
      }),
      timeoutMs: OPENAI_TIMEOUT_MS,
    });
  } catch {
    return retryable("Moderation API unreachable");
  }
  if (response.status !== 200) {
    return retryable(`Moderation API returned HTTP ${response.status}`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return retryable("Moderation API returned invalid JSON");
  }
  const parsed = parseModerationResponse(body);
  if (!parsed.ok) {
    return retryable(`Unexpected moderation response: ${parsed.error}`);
  }
  const screenResult = screenResultFor(parsed.outcome);
  const screenedAt = new Date().toISOString();
  // One path string, but two bucket copies can carry it (pending and
  // public); cleanup-images checks both buckets for every listed path.
  const mediaPaths = [row.pending_path];

  // 3. Flagged: reject, record, notify, quarantine.
  if (decideScreening(parsed.outcome) === "rejected") {
    const { error: updateError } = await db
      .from("post_images")
      .update({
        status: "rejected",
        screen_result: screenResult,
        screened_at: screenedAt,
      })
      .eq("id", row.id);
    if (updateError) return retryable("Could not record the rejection");

    const { data: action, error: actionError } = await db
      .from("moderation_actions")
      .insert(
        buildModerationRecord({
          postId: row.post_id,
          authorId: row.author_id,
          mediaPaths,
          reason: AUTOMATIC_SCREENING_REASON,
        }),
      )
      .select("id")
      .single();
    if (actionError) {
      return retryable("Could not record the moderation action");
    }
    const actionId = (action as { id: string }).id;

    const { error: notifyError } = await db.from("notifications").insert(
      buildModerationNotification({
        recipientId: row.author_id,
        postId: row.post_id,
        actionId,
      }),
    );
    // The decision is recorded; a lost notification must not undo it.
    if (notifyError) {
      console.error("rejection notification failed:", notifyError.message);
    }

    // Best effort: if the move fails, the daily cleanup-images run
    // finishes it, because the record's media_paths lists this path.
    const moved = await moveToQuarantine(db, PENDING_BUCKET, row.pending_path);
    if (moved === "error") {
      console.error(
        "could not move rejected file to quarantine:",
        row.pending_path,
      );
    }
    return json(200, { status: "rejected" });
  }

  // 4. Clean: publish, then pre-warm the cache.
  const copied = await copyAcrossBuckets(
    db,
    PENDING_BUCKET,
    PUBLIC_BUCKET,
    row.pending_path,
  );
  if (!copied) return retryable("Could not publish the image");

  const { error: approveError } = await db
    .from("post_images")
    .update({
      status: "approved",
      public_path: row.pending_path,
      screen_result: screenResult,
      screened_at: screenedAt,
    })
    .eq("id", row.id);
  if (approveError) {
    // The row is still pending, so no public_path owns the public copy;
    // the daily cleanup-images run deletes it as an orphan.
    return retryable("Could not approve the image");
  }

  // Fetch once through the Worker so Cloudflare caches the image and its
  // CSAM Scanning Tool checks it before anyone else asks for it.
  let warmupStatus = 0;
  try {
    const warmup = await fetchWithTimeout(`${IMG_HOST}/${row.pending_path}`, {
      timeoutMs: WARMUP_TIMEOUT_MS,
    });
    warmupStatus = warmup.status;
    await warmup.body?.cancel();
  } catch {
    warmupStatus = 0;
  }
  if (!isBlockedWarmupStatus(warmupStatus)) {
    if (warmupStatus === 0) {
      // Not fatal: the first request then warms (and checks) the cache.
      console.warn(
        "cache warm-up failed; the first request will warm it:",
        row.pending_path,
      );
    }
    return json(200, { status: "approved" });
  }

  // 5. A 451: the scanner matched known abuse material. Block the row,
  // pull the file back, record the action, alert every admin. The owner
  // follows the written CSAM procedure from here (disable the account,
  // lock the evidence, report to the police).
  const { error: blockError } = await db
    .from("post_images")
    .update({ status: "blocked" })
    .eq("id", row.id);
  if (blockError) return retryable("Could not block the image");

  const { data: blockedAction, error: blockedActionError } = await db
    .from("moderation_actions")
    .insert(
      buildModerationRecord({
        postId: row.post_id,
        authorId: row.author_id,
        mediaPaths,
        reason: ABUSE_MATCH_REASON,
      }),
    )
    .select("id")
    .single();
  if (blockedActionError) {
    return retryable("Could not record the moderation action");
  }
  const actionId = (blockedAction as { id: string }).id;

  // Move the pending copy to quarantine and delete the public one. Both
  // carry the same path; if a step fails, the daily cleanup-images run
  // finishes it (the record's media_paths lists the path).
  const moved = await moveToQuarantine(db, PENDING_BUCKET, row.pending_path);
  if (moved === "error") {
    console.error(
      "could not move blocked file to quarantine:",
      row.pending_path,
    );
  }
  const publicRemoved = await removeFile(db, PUBLIC_BUCKET, row.pending_path);
  if (!publicRemoved) {
    console.error("could not delete the public copy:", row.pending_path);
  }

  // Notify every admin (users with an admin row in user_roles).
  const adminIds: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .range(offset, offset + 999);
    if (error) {
      console.error("could not read admins:", error.message);
      break;
    }
    for (const admin of data as { user_id: string }[]) {
      adminIds.push(admin.user_id);
    }
    if (data.length < 1000) break;
  }
  if (adminIds.length > 0) {
    const { error: notifyError } = await db.from("notifications").insert(
      adminIds.map((adminId) =>
        buildModerationNotification({
          recipientId: adminId,
          postId: row.post_id,
          actionId,
        }),
      ),
    );
    if (notifyError) {
      console.error("admin notification failed:", notifyError.message);
    }
  }

  return json(200, { status: "blocked" });
});
