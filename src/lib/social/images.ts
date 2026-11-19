/**
 * Image posts: the client half of the image-posts wave. Everything here is
 * gated behind the VITE_IMAGE_POSTS build flag (`imagePostsEnabled()`); when
 * the flag is off the app behaves exactly as before.
 *
 * Two halves:
 * - pure helpers (the flag, the CDN URL, the scaling math and the
 *   decode/scale/re-encode pipeline that also strips EXIF metadata);
 * - TanStack Query hooks: one batched read (`usePostImages`) and one attach
 *   mutation (`useAttachPostImages`) that uploads, inserts and screens.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { useAuth } from "@/lib/auth/use-auth";
import type { PostImageRow } from "@/lib/database.types";
import { t } from "@/lib/i18n/t";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import {
  describeWriteError,
  isSocialNotInstalled,
  softReadError,
} from "@/lib/social/availability";
import {
  socialFail,
  socialSucceed,
  type SocialFailure,
  type SocialResult,
} from "@/lib/social/errors";

/** At most 4 images per post (the table enforces positions 0 to 3). */
export const IMAGE_POSTS_MAX = 4;
/** The long side of a processed image, in pixels. */
export const IMAGE_MAX_LONG_SIDE = 1600;
/** Files above this size are rejected before they are decoded. */
export const IMAGE_MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** The WebP re-encode quality. */
export const IMAGE_WEBP_QUALITY = 0.82;
/** The optional image description, `post_images.alt`. */
export const IMAGE_ALT_MAX = 300;
/** The private bucket author uploads go to. */
export const PENDING_BUCKET = "post-images-pending";
/** Approved images are served from this CDN host (public_path is the rest). */
export const IMAGE_CDN_BASE = "https://img.ohkolab.com";

/**
 * Whether image posts are switched on for this build. The whole feature hides
 * behind this flag so the client ships before the migration is applied.
 */
export function imagePostsEnabled(): boolean {
  return import.meta.env.VITE_IMAGE_POSTS === "true";
}

/** The public URL of an approved image, from its `public_path`. */
export function imageUrl(publicPath: string): string {
  return `${IMAGE_CDN_BASE}/${publicPath.replace(/^\/+/, "")}`;
}

/** A fresh uuid for one image's storage path. */
export function newImageId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

/**
 * The pure scaling math: shrink so the long side is at most `maxLongSide`,
 * preserving the aspect ratio. Images that already fit are returned
 * unchanged (rounded to whole pixels); the short side never drops below 1.
 */
export function scaledDimensions(
  width: number,
  height: number,
  maxLongSide: number = IMAGE_MAX_LONG_SIDE,
): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.round(width) || 1);
  const safeHeight = Math.max(1, Math.round(height) || 1);
  const long = Math.max(safeWidth, safeHeight);
  if (long <= maxLongSide) {
    return { width: safeWidth, height: safeHeight };
  }
  const scale = maxLongSide / long;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

/** Trims an optional image description and caps it at `IMAGE_ALT_MAX`. */
export function clampImageAlt(alt: string | null | undefined): string {
  const trimmed = (alt ?? "").trim();
  return trimmed.slice(0, IMAGE_ALT_MAX);
}

/** A decoded bitmap, minimal for the pipeline (tests inject fakes). */
export interface ImageBitmapLike {
  width: number;
  height: number;
  close?: () => void;
}

/** The 2D context the pipeline needs (tests inject fakes). */
export interface DrawContext2D {
  drawImage(
    image: ImageBitmapLike,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

/** A canvas, minimal for the pipeline (tests inject fakes). */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: "2d"): DrawContext2D | null;
  toBlob(
    callback: (blob: Blob | null) => void,
    type?: string,
    quality?: number,
  ): void;
}

/** The browser APIs the pipeline uses, injectable for tests. */
export interface ImagePipeline {
  createBitmap(file: Blob): Promise<ImageBitmapLike>;
  makeCanvas(): CanvasLike;
}

const browserPipeline: ImagePipeline = {
  createBitmap(file) {
    return createImageBitmap(file) as Promise<ImageBitmapLike>;
  },
  makeCanvas() {
    return document.createElement("canvas") as unknown as CanvasLike;
  },
};

/** One processed image, ready to upload. */
export interface PreparedImage {
  /** The re-encoded WebP blob (never the original file). */
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Validates, decodes, scales and re-encodes one file as WebP:
 * - over-15 MB files are rejected before decoding;
 * - anything that is not an image (MIME type or decode failure) is rejected;
 * - the long side is capped at 1600px and the bitmap is re-encoded as WebP
 *   at quality 0.82, which is also what strips EXIF (including GPS) data —
 *   the original file is never sent anywhere.
 */
export async function prepareImage(
  file: File | { size: number; type: string },
  pipeline: ImagePipeline = browserPipeline,
): Promise<SocialResult<PreparedImage>> {
  if (file.size > IMAGE_MAX_INPUT_BYTES) {
    return socialFail("invalid_input", t("social.images.tooBig"));
  }
  if (!file.type.startsWith("image/")) {
    return socialFail("invalid_input", t("social.images.notImage"));
  }
  let bitmap: ImageBitmapLike;
  try {
    bitmap = await pipeline.createBitmap(file as File);
  } catch {
    return socialFail("invalid_input", t("social.images.unreadable"));
  }
  try {
    const size = scaledDimensions(bitmap.width, bitmap.height);
    const canvas = pipeline.makeCanvas();
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return socialFail("unknown", t("social.images.noCanvas"));
    }
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", IMAGE_WEBP_QUALITY);
    });
    if (!blob || blob.type !== "image/webp") {
      return socialFail("invalid_input", t("social.images.unconvertible"));
    }
    return socialSucceed({ blob, width: size.width, height: size.height });
  } finally {
    bitmap.close?.();
  }
}

/** An image row reduced to what the UI shows. */
export interface PostImageDisplay {
  id: string;
  status: "approved" | "pending" | "rejected";
  /** The CDN URL; null unless approved with a public path. */
  url: string | null;
  alt: string | null;
  /**
   * The row's `created_at`, for pending images only: the UI uses it to spot
   * images stuck pending for a day (a screening that never succeeded).
   */
  pendingSince: string | null;
}

/**
 * Picks the rows one viewer may see, ordered by position:
 * - approved images for everyone (non-authors get only these);
 * - the author additionally sees their pending ("Checking image…") and
 *   rejected ("Image removed by automatic screening") rows;
 * - blocked rows are hidden from everyone, the author included.
 * RLS already filters this server-side; the UI filters again on its own.
 */
export function visiblePostImages(
  rows: PostImageRow[],
  isAuthor: boolean,
): PostImageDisplay[] {
  const displays: PostImageDisplay[] = [];
  for (const row of [...rows].sort((a, b) => a.position - b.position)) {
    if (row.status === "blocked") continue;
    if (row.status === "approved") {
      if (row.public_path) {
        displays.push({
          id: row.id,
          status: "approved",
          url: imageUrl(row.public_path),
          alt: row.alt,
          pendingSince: null,
        });
      } else if (isAuthor) {
        // Approved without a public path should not happen; do not pretend.
        displays.push({
          id: row.id,
          status: "pending",
          url: null,
          alt: row.alt,
          pendingSince: row.created_at,
        });
      }
      continue;
    }
    if (row.status === "pending" || row.status === "rejected") {
      if (isAuthor) {
        displays.push({
          id: row.id,
          status: row.status,
          url: null,
          alt: row.alt,
          pendingSince: row.status === "pending" ? row.created_at : null,
        });
      }
    }
  }
  return displays;
}

/**
 * The image rows of a set of posts, in one request (one query per feed page,
 * not per card). The server's RLS policies decide which rows come back;
 * `visiblePostImages` re-checks on the client. Disabled while the
 * VITE_IMAGE_POSTS flag is off, so no query fires at all.
 *
 * A real read error surfaces as the query's error (`isError` true, a mapped
 * `SocialFailure`), so the consumers can offer a retry instead of silently
 * hiding the images. Only the "not installed" / "flag off" paths return an
 * empty list: no images exist to show, so that is the truth.
 */
export function usePostImages(
  postIds: string[],
  client: AppSupabaseClient | null = supabase,
): UseQueryResult<PostImageRow[], SocialFailure> {
  const key = [...postIds].sort().join(",");
  return useQuery<PostImageRow[], SocialFailure>({
    queryKey: ["social", "post-images", key],
    queryFn: async () => {
      if (!client || isSocialNotInstalled()) {
        return [];
      }
      const { data, error } = await client
        .from("post_images")
        .select("*")
        .in("post_id", postIds)
        .order("position", { ascending: true });
      if (error) {
        return softReadError(error, []);
      }
      return data ?? [];
    },
    enabled:
      imagePostsEnabled() &&
      client !== null &&
      postIds.length > 0 &&
      key !== "",
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Screening retries and stuck images. `screen-image` answers with a
// retryable 503 whenever it could not finish (OpenAI down, timeout, storage
// hiccup); without the retries below the row would sit "pending" forever
// with no way out for the author.
// ---------------------------------------------------------------------------

/** How long to wait before the automatic retries (2 retries, short backoff). */
export const SCREEN_RETRY_DELAYS_MS: number[] = [400, 1200];

/** The wait function, injectable so tests can run without timers. */
export type Sleep = (ms: number) => Promise<void>;

const browserSleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls `screen-image` for one image, retrying twice with a short backoff
 * while it errors or answers a retryable 503. Resolves to whether a call
 * went through — the row's actual verdict (approved or rejected) arrives
 * through the refetched `post_images` row, not this response.
 */
export async function screenImageWithRetry(
  client: AppSupabaseClient,
  imageId: string,
  options: { sleep?: Sleep } = {},
): Promise<boolean> {
  const sleep = options.sleep ?? browserSleep;
  for (
    let attempt = 0;
    attempt <= SCREEN_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    if (attempt > 0) {
      await sleep(SCREEN_RETRY_DELAYS_MS[attempt - 1] ?? 0);
    }
    const { error } = await client.functions.invoke("screen-image", {
      body: { imageId },
    });
    if (!error) return true;
  }
  return false;
}

/**
 * The ids of images whose screening failed in this session, so the UI can
 * offer "Try again". Not persisted: a page reload falls back to the plain
 * "Checking image…" notice until the 24-hour rule below kicks in.
 */
// Replaced (never mutated) on every change: useSyncExternalStore compares
// snapshots by identity, so an in-place change would not re-render.
let screenFailures: ReadonlySet<string> = new Set<string>();
const screenFailureListeners = new Set<() => void>();

function setScreenFailures(next: ReadonlySet<string>): void {
  screenFailures = next;
  for (const listener of screenFailureListeners) listener();
}

/** Records that an image's screening could not be completed. */
export function noteScreenFailure(imageId: string): void {
  if (screenFailures.has(imageId)) return;
  setScreenFailures(new Set([...screenFailures, imageId]));
}

/** Forgets a failed screening (it succeeded on retry, or the row is gone). */
export function clearScreenFailure(imageId: string): void {
  if (!screenFailures.has(imageId)) return;
  const next = new Set(screenFailures);
  next.delete(imageId);
  setScreenFailures(next);
}

/** Forgets every failed screening (tests reset the module state). */
export function clearAllScreenFailures(): void {
  if (screenFailures.size === 0) return;
  setScreenFailures(new Set<string>());
}

/** The currently failed image ids, reactive for the UI. */
export function useFailedScreenings(): ReadonlySet<string> {
  return useSyncExternalStore(
    (onChange) => {
      screenFailureListeners.add(onChange);
      return () => {
        screenFailureListeners.delete(onChange);
      };
    },
    () => screenFailures,
    () => screenFailures,
  );
}

/** A pending image older than this counts as stuck. */
export const PENDING_IMAGE_STALE_MS = 24 * 60 * 60 * 1000;

/** True when a pending image's upload is more than a day behind us. */
export function isStalePending(
  pendingSince: string | null,
  now: number = Date.now(),
): boolean {
  if (!pendingSince) return false;
  const uploadedAt = Date.parse(pendingSince);
  return (
    Number.isFinite(uploadedAt) && now - uploadedAt >= PENDING_IMAGE_STALE_MS
  );
}

/** One image to attach to a freshly created post. */
export interface AttachImageInput {
  blob: Blob;
  width: number;
  height: number;
  alt?: string | null;
}

export interface AttachPostImagesInput {
  postId: string;
  images: AttachImageInput[];
}

/** What happened to one image of the attach call. */
export interface ImageAttachOutcome {
  /** The position the image was meant for (0 to 3). */
  position: number;
  /** True when the file reached the pending bucket. */
  uploaded: boolean;
  /** The inserted row's id, or null when the insert failed. */
  imageId: string | null;
  /** False when the screening call errored; the image stays pending. */
  screened: boolean;
  /** Null on success; a mapped failure the composer can toast. */
  error: SocialFailure | null;
}

/**
 * Attaches images to a just-created post, one image at a time so a partial
 * failure never takes the post down: upload the WebP blob to
 * `post-images-pending/{uid}/{post_id}/{image_id}.webp`, insert the pending
 * row, then invoke the `screen-image` Edge Function with the new row id. A
 * failed screening call is fine — the image stays pending until the function
 * retries.
 */
export function useAttachPostImages(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<
  SocialResult<ImageAttachOutcome[]>,
  SocialFailure,
  AttachPostImagesInput
> {
  const { user } = useAuth();
  return useMutation<
    SocialResult<ImageAttachOutcome[]>,
    SocialFailure,
    AttachPostImagesInput
  >({
    mutationFn: async (input): Promise<SocialResult<ImageAttachOutcome[]>> => {
      if (!imagePostsEnabled()) return socialFail("not_installed");
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      if (input.images.length > IMAGE_POSTS_MAX) {
        return socialFail(
          "invalid_input",
          t("social.images.tooMany", { n: IMAGE_POSTS_MAX }),
        );
      }
      const outcomes: ImageAttachOutcome[] = [];
      for (const [index, image] of input.images
        .slice(0, IMAGE_POSTS_MAX)
        .entries()) {
        const position = index;
        const fileUuid = newImageId();
        const path = `${me}/${input.postId}/${fileUuid}.webp`;
        const upload = await client.storage
          .from(PENDING_BUCKET)
          .upload(path, image.blob, { contentType: "image/webp" });
        if (upload.error) {
          outcomes.push({
            position,
            uploaded: false,
            imageId: null,
            screened: false,
            error: describeWriteError(upload.error),
          });
          continue;
        }
        const alt = clampImageAlt(image.alt);
        const { data, error } = await client
          .from("post_images")
          .insert({
            post_id: input.postId,
            author_id: me,
            position,
            pending_path: path,
            width: image.width,
            height: image.height,
            bytes: image.blob.size,
            alt: alt === "" ? null : alt,
          })
          .select("*")
          .single();
        if (error) {
          outcomes.push({
            position,
            uploaded: true,
            imageId: null,
            screened: false,
            error: describeWriteError(error),
          });
          continue;
        }
        const rowId = (data as PostImageRow | null)?.id ?? null;
        let screened = true;
        if (rowId) {
          screened = await screenImageWithRetry(client, rowId);
          if (!screened) noteScreenFailure(rowId);
        }
        outcomes.push({
          position,
          uploaded: true,
          imageId: rowId,
          screened,
          error: null,
        });
      }
      return socialSucceed(outcomes);
    },
  });
}

/**
 * Screens one stuck image again, on the author's "Try again". On success the
 * refetched rows show the verdict (approved or rejected); the failure note
 * is cleared either way the call went through.
 */
export function useRetryScreenImage(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, string> {
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, string>({
    mutationFn: async (imageId): Promise<SocialResult<undefined>> => {
      if (!imagePostsEnabled()) return socialFail("not_installed");
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const ok = await screenImageWithRetry(client, imageId);
      if (!ok)
        return socialFail("unknown", t("social.images.screenRetryFailed"));
      clearScreenFailure(imageId);
      return socialSucceed(undefined);
    },
    onSuccess: () => {
      // The verdict (approved or rejected) shows once the rows refetch.
      void queryClient.invalidateQueries({
        queryKey: ["social", "post-images"],
      });
    },
  });
}

/**
 * Removes the author's own stuck image (pending, no successful screening):
 * deletes the `post_images` row through the narrow policy from the
 * `pending_image_delete` migration. The orphaned storage file is removed
 * later by the cleanup-images function.
 */
export function useRemovePendingImage(
  client: AppSupabaseClient | null = supabase,
): UseMutationResult<SocialResult<undefined>, SocialFailure, string> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<SocialResult<undefined>, SocialFailure, string>({
    mutationFn: async (imageId): Promise<SocialResult<undefined>> => {
      if (!imagePostsEnabled()) return socialFail("not_installed");
      if (isSocialNotInstalled()) return socialFail("not_installed");
      if (!client) return socialFail("not_configured");
      const me = user?.id ?? null;
      if (!me) return socialFail("not_signed_in");
      // The server's policy decides; the extra filters only shape the call.
      const { data, error } = await client
        .from("post_images")
        .delete()
        .eq("id", imageId)
        .eq("author_id", me)
        .eq("status", "pending")
        .select("id");
      if (error) return { ok: false, error: describeWriteError(error) };
      // Nothing deleted means the row is not ours or no longer pending.
      if (!data || data.length === 0) {
        return socialFail("forbidden", t("social.images.removeFailed"));
      }
      clearScreenFailure(imageId);
      return socialSucceed(undefined);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["social", "post-images"],
      });
    },
  });
}
