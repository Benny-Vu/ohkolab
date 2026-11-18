import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PostImageRow } from "@/lib/database.types";
import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  expectFailed,
  postImageRow,
  runMutation,
  SIGNED_IN_AUTH,
} from "@/lib/social/test-client";
import {
  clearAllScreenFailures,
  clearScreenFailure,
  clampImageAlt,
  imagePostsEnabled,
  imageUrl,
  isStalePending,
  newImageId,
  noteScreenFailure,
  prepareImage,
  scaledDimensions,
  screenImageWithRetry,
  useAttachPostImages,
  useFailedScreenings,
  usePostImages,
  useRemovePendingImage,
  useRetryScreenImage,
  visiblePostImages,
  IMAGE_ALT_MAX,
  IMAGE_MAX_INPUT_BYTES,
  IMAGE_POSTS_MAX,
  type ImagePipeline,
} from "@/lib/social/images";

/** A fake bitmap: just the size. */
function fakeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() };
}

interface FakeToBlobCall {
  type?: string;
  quality?: number;
}

/**
 * A fake pipeline: records toBlob arguments, draws nothing, and resolves
 * with the WebP blob `toBlobResult` (null by default is set per test).
 */
function fakePipeline(
  bitmap: { width: number; height: number; close?: () => void } | Error,
  toBlobResult: Blob | null = {
    type: "image/webp",
    size: 1234,
  } as unknown as Blob,
) {
  const drawImage = vi.fn();
  const toBlobCalls: FakeToBlobCall[] = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage }),
    toBlob: (
      callback: (blob: Blob | null) => void,
      type?: string,
      quality?: number,
    ) => {
      toBlobCalls.push({ type, quality });
      callback(toBlobResult);
    },
  };
  const pipeline: ImagePipeline = {
    createBitmap: vi.fn(async () => {
      if (bitmap instanceof Error) throw bitmap;
      return bitmap;
    }),
    makeCanvas: () => canvas,
  };
  return { pipeline, drawImage, toBlobCalls };
}

function imageFile(type = "image/png", size = 1024): File {
  return { type, size } as unknown as File;
}

afterEach(() => {
  vi.unstubAllEnvs();
  clearAllScreenFailures();
});

describe("imagePostsEnabled", () => {
  it("is on only when VITE_IMAGE_POSTS is exactly 'true'", () => {
    expect(imagePostsEnabled()).toBe(false);
    vi.stubEnv("VITE_IMAGE_POSTS", "false");
    expect(imagePostsEnabled()).toBe(false);
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    expect(imagePostsEnabled()).toBe(true);
  });
});

describe("imageUrl", () => {
  it("builds the CDN URL from the public path", () => {
    expect(imageUrl("user-1/post-1/img.webp")).toBe(
      "https://img.ohkolab.com/user-1/post-1/img.webp",
    );
  });

  it("strips leading slashes", () => {
    expect(imageUrl("/user-1/post-1/img.webp")).toBe(
      "https://img.ohkolab.com/user-1/post-1/img.webp",
    );
  });
});

describe("newImageId", () => {
  it("returns distinct uuid-shaped ids", () => {
    const a = newImageId();
    const b = newImageId();
    expect(a).not.toBe(b);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("clampImageAlt", () => {
  it("trims and caps the description at 300 characters", () => {
    expect(clampImageAlt("  hello  ")).toBe("hello");
    expect(clampImageAlt(null)).toBe("");
    expect(clampImageAlt("x".repeat(400))).toHaveLength(IMAGE_ALT_MAX);
  });
});

describe("scaledDimensions", () => {
  it("keeps images that already fit unchanged", () => {
    expect(scaledDimensions(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledDimensions(1600, 1600)).toEqual({ width: 1600, height: 1600 });
    expect(scaledDimensions(100, 50)).toEqual({ width: 100, height: 50 });
  });

  it("caps the long side at 1600 for landscape images", () => {
    expect(scaledDimensions(3200, 2400)).toEqual({ width: 1600, height: 1200 });
  });

  it("caps the long side at 1600 for portrait images", () => {
    expect(scaledDimensions(2400, 3200)).toEqual({ width: 1200, height: 1600 });
  });

  it("preserves the aspect ratio when scaling", () => {
    const result = scaledDimensions(4032, 3024);
    expect(Math.max(result.width, result.height)).toBe(1600);
    expect(result.width / result.height).toBeCloseTo(4032 / 3024, 2);
  });

  it("never returns a zero side", () => {
    expect(scaledDimensions(1600, 1)).toEqual({ width: 1600, height: 1 });
    expect(scaledDimensions(1, 1600)).toEqual({ width: 1, height: 1600 });
  });
});

describe("prepareImage", () => {
  it("rejects files over 15 MB before decoding", async () => {
    const { pipeline } = fakePipeline(fakeBitmap(100, 100));
    const result = await prepareImage(
      imageFile("image/png", IMAGE_MAX_INPUT_BYTES + 1),
      pipeline,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_input");
    expect(pipeline.createBitmap).not.toHaveBeenCalled();
  });

  it("rejects non-image files", async () => {
    const { pipeline } = fakePipeline(fakeBitmap(100, 100));
    const result = await prepareImage(imageFile("text/plain"), pipeline);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_input");
    expect(pipeline.createBitmap).not.toHaveBeenCalled();
  });

  it("rejects files that fail to decode", async () => {
    const { pipeline } = fakePipeline(new Error("nope"));
    const result = await prepareImage(imageFile(), pipeline);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_input");
  });

  it("rejects canvases that cannot produce a WebP blob", async () => {
    const { pipeline } = fakePipeline(fakeBitmap(100, 100), null);
    const result = await prepareImage(imageFile(), pipeline);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_input");
  });

  it("rejects blobs that come back as another format", async () => {
    const { pipeline } = fakePipeline(fakeBitmap(100, 100), {
      type: "image/png",
      size: 10,
    } as unknown as Blob);
    const result = await prepareImage(imageFile(), pipeline);
    expect(result.ok).toBe(false);
  });

  it("scales, re-encodes as WebP at 0.82 and returns the size", async () => {
    const { pipeline, drawImage, toBlobCalls } = fakePipeline(
      fakeBitmap(3200, 2400),
    );
    const result = await prepareImage(imageFile(), pipeline);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.width).toBe(1600);
      expect(result.data.height).toBe(1200);
      expect(result.data.blob).toBeDefined();
    }
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
    expect(toBlobCalls[0]).toEqual({ type: "image/webp", quality: 0.82 });
  });
});

describe("visiblePostImages", () => {
  const rows: PostImageRow[] = [
    postImageRow({ id: "img-0", position: 0 }),
    postImageRow({
      id: "img-1",
      position: 1,
      status: "pending",
      public_path: null,
      screened_at: null,
    }),
    postImageRow({
      id: "img-2",
      position: 2,
      status: "rejected",
      public_path: null,
    }),
    postImageRow({ id: "img-3", position: 3, status: "blocked" }),
  ];

  it("shows approved images to everyone", () => {
    const displays = visiblePostImages(rows, false);
    expect(displays).toHaveLength(1);
    expect(displays[0]).toMatchObject({
      id: "img-0",
      status: "approved",
      url: "https://img.ohkolab.com/user-1/post-1/image-a.webp",
    });
  });

  it("shows pending and rejected rows to the author only", () => {
    const displays = visiblePostImages(rows, true);
    expect(displays.map((display) => display.id)).toEqual([
      "img-0",
      "img-1",
      "img-2",
    ]);
    expect(displays[1]).toMatchObject({ status: "pending", url: null });
    expect(displays[2]).toMatchObject({ status: "rejected", url: null });
  });

  it("never shows blocked rows, not even to the author", () => {
    const displays = visiblePostImages(rows, true);
    expect(displays.some((display) => display.id === "img-3")).toBe(false);
  });

  it("orders by position and keeps the alt text", () => {
    const unordered = [
      postImageRow({ id: "img-b", position: 1, alt: "Second" }),
      postImageRow({ id: "img-a", position: 0, alt: "First" }),
    ];
    const displays = visiblePostImages(unordered, false);
    expect(displays.map((display) => display.alt)).toEqual(["First", "Second"]);
  });

  it("treats approved rows without a public path as pending", () => {
    const broken = [postImageRow({ id: "img-x", public_path: null })];
    expect(visiblePostImages(broken, false)).toHaveLength(0);
    expect(visiblePostImages(broken, true)).toEqual([
      {
        id: "img-x",
        status: "pending",
        url: null,
        alt: null,
        pendingSince: "2026-11-19T10:00:00.000Z",
      },
    ]);
  });

  it("carries the upload time on pending rows for the stale check", () => {
    const rows = [
      postImageRow({
        id: "img-p",
        status: "pending",
        public_path: null,
        created_at: "2026-11-18T09:00:00.000Z",
      }),
      postImageRow({
        id: "img-r",
        status: "rejected",
        public_path: null,
      }),
    ];
    const displays = visiblePostImages(rows, true);
    expect(displays[0]).toMatchObject({
      id: "img-p",
      pendingSince: "2026-11-18T09:00:00.000Z",
    });
    expect(displays[1]).toMatchObject({ id: "img-r", pendingSince: null });
  });
});

describe("usePostImages", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
  });

  it("fetches many posts' rows in one request", async () => {
    const rows = [
      postImageRow({ id: "img-1", post_id: "post-1" }),
      postImageRow({ id: "img-2", post_id: "post-2", position: 1 }),
    ];
    const fake = createFakeClient({
      tables: { post_images: { data: rows, error: null } },
    });
    const { result } = renderHook(
      () => usePostImages(["post-2", "post-1"], fake.client),
      { wrapper: createWrapper(createQueryClient()) },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(rows);
    expect(fake.records).toHaveLength(1);
    const record = fake.records[0];
    expect(record).toBeDefined();
    expect(record).toMatchObject({ table: "post_images" });
    expect(record!.inFilters[0]).toEqual(["post_id", ["post-2", "post-1"]]);
  });

  it("fires no query while the flag is off", async () => {
    vi.unstubAllEnvs();
    const fake = createFakeClient();
    const { result } = renderHook(
      () => usePostImages(["post-1"], fake.client),
      {
        wrapper: createWrapper(createQueryClient()),
      },
    );
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(fake.records).toHaveLength(0);
    expect(result.current.data).toBeUndefined();
  });

  it("fires no query without post ids", async () => {
    const fake = createFakeClient();
    const { result } = renderHook(() => usePostImages([], fake.client), {
      wrapper: createWrapper(createQueryClient()),
    });
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(fake.records).toHaveLength(0);
  });
});

describe("useAttachPostImages", () => {
  const webp = { type: "image/webp", size: 90000 } as unknown as Blob;

  function imageInput(overrides: Record<string, unknown> = {}) {
    return { blob: webp, width: 1600, height: 900, alt: null, ...overrides };
  }

  beforeEach(() => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
  });

  it("uploads, inserts and screens each image in order", async () => {
    let inserted = 0;
    const fake = createFakeClient({
      resolve: (record) => {
        if (record.table === "post_images") {
          inserted += 1;
          return {
            data: postImageRow({
              id: `row-${inserted}`,
              position: inserted - 1,
            }),
            error: null,
          };
        }
        return { data: [], error: null };
      },
    });
    const result = await runMutation(() => useAttachPostImages(fake.client), {
      postId: "post-9",
      images: [imageInput({ alt: "A Garchomp" }), imageInput()],
    });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.data).toEqual([
        {
          position: 0,
          uploaded: true,
          imageId: "row-1",
          screened: true,
          error: null,
        },
        {
          position: 1,
          uploaded: true,
          imageId: "row-2",
          screened: true,
          error: null,
        },
      ]);
    }
    expect(fake.uploads).toHaveLength(2);
    const [firstUpload, secondUpload] = fake.uploads;
    expect(firstUpload).toBeDefined();
    expect(secondUpload).toBeDefined();
    expect(firstUpload!.bucket).toBe("post-images-pending");
    expect(firstUpload!.path).toMatch(/^user-1\/post-9\/[^/]+\.webp$/);
    expect(firstUpload!.options).toEqual({ contentType: "image/webp" });
    expect(firstUpload!.body).toBe(webp);
    expect(secondUpload!.path).not.toBe(firstUpload!.path);

    const insertValues = fake.records
      .filter((record) => record.table === "post_images")
      .flatMap((record) => record.insertValues ?? []);
    expect(insertValues).toEqual([
      expect.objectContaining({
        post_id: "post-9",
        author_id: "user-1",
        position: 0,
        pending_path: firstUpload!.path,
        width: 1600,
        height: 900,
        bytes: 90000,
        alt: "A Garchomp",
      }),
      expect.objectContaining({
        position: 1,
        pending_path: secondUpload!.path,
        alt: null,
      }),
    ]);

    expect(fake.invokes).toEqual([
      { fn: "screen-image", options: { body: { imageId: "row-1" } } },
      { fn: "screen-image", options: { body: { imageId: "row-2" } } },
    ]);
  });

  it("maps a failed upload to a failed outcome without failing the post", async () => {
    const fake = createFakeClient({
      storage: (record) =>
        fake.uploads.length === 1
          ? { data: null, error: { message: "boom" } }
          : { data: { path: record.path }, error: null },
    });
    const result = await runMutation(() => useAttachPostImages(fake.client), {
      postId: "post-9",
      images: [imageInput(), imageInput()],
    });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.data[0]?.uploaded).toBe(false);
      expect(result.data[0]?.imageId).toBeNull();
      expect(result.data[0]?.error).not.toBeNull();
      expect(result.data[1]?.uploaded).toBe(true);
      expect(result.data[1]?.error).toBeNull();
    }
  });

  it("maps the P0A07 image rate limit to rate_limited", async () => {
    const fake = createFakeClient({
      storage: { "post-images-pending": { data: { path: "x" }, error: null } },
      resolve: (record) =>
        record.table === "post_images"
          ? { data: null, error: { code: "P0A07", message: "too many" } }
          : { data: [], error: null },
    });
    const result = await runMutation(() => useAttachPostImages(fake.client), {
      postId: "post-9",
      images: [imageInput()],
    });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.data[0]?.error?.code).toBe("rate_limited");
      expect(result.data[0]?.imageId).toBeNull();
    }
  });

  it("keeps the image pending when the screening call errors", async () => {
    const fake = createFakeClient({
      tables: {
        post_images: { data: postImageRow({ id: "row-1" }), error: null },
      },
      functions: { "screen-image": { data: null, error: { message: "503" } } },
    });
    const result = await runMutation(() => useAttachPostImages(fake.client), {
      postId: "post-9",
      images: [imageInput()],
    });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.data[0]).toMatchObject({
        uploaded: true,
        imageId: "row-1",
        screened: false,
        error: null,
      });
    }
  });

  it("rejects more images than the per-post maximum", async () => {
    const fake = createFakeClient();
    const result = await runMutation(() => useAttachPostImages(fake.client), {
      postId: "post-9",
      images: Array.from({ length: IMAGE_POSTS_MAX + 1 }, () => imageInput()),
    });
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.error.code).toBe("invalid_input");
    }
    expect(fake.uploads).toHaveLength(0);
  });

  it("fails with not_installed while the flag is off", async () => {
    vi.unstubAllEnvs();
    const fake = createFakeClient();
    const result = await runMutation(() => useAttachPostImages(fake.client), {
      postId: "post-9",
      images: [imageInput()],
    });
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.error.code).toBe("not_installed");
    }
    expect(fake.uploads).toHaveLength(0);
  });

  it("fails with not_signed_in for guests", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      () => useAttachPostImages(fake.client),
      { postId: "post-9", images: [imageInput()] },
      { auth: { ...SIGNED_IN_AUTH, user: null } },
    );
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.error.code).toBe("not_signed_in");
    }
  });

  it("retries a failing screening call twice before giving up", async () => {
    // A queue the fake drains one invoke at a time: fail, fail, succeed.
    let outcomes: Array<{ data: unknown; error: unknown }> = [
      { data: null, error: { message: "503" } },
      { data: null, error: { message: "503" } },
      { data: { ok: true }, error: null },
    ];
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "post_images"
          ? { data: postImageRow({ id: "row-1" }), error: null }
          : { data: [], error: null },
      functions: {
        get "screen-image"() {
          const outcome = outcomes[0];
          outcomes = outcomes.slice(1);
          return outcome ?? { data: null, error: null };
        },
      },
    });
    const result = await runMutation(() => useAttachPostImages(fake.client), {
      postId: "post-9",
      images: [imageInput()],
    });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.data[0]).toMatchObject({
        imageId: "row-1",
        screened: true,
      });
    }
    expect(fake.invokes).toHaveLength(3);
  });

  it("notes the screening failure for the author's retry button", async () => {
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "post_images"
          ? { data: postImageRow({ id: "row-1" }), error: null }
          : { data: [], error: null },
      functions: { "screen-image": { data: null, error: { message: "503" } } },
    });
    const { result: registry } = renderHook(() => useFailedScreenings());
    expect(registry.current.size).toBe(0);

    const result = await runMutation(() => useAttachPostImages(fake.client), {
      postId: "post-9",
      images: [imageInput()],
    });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.data[0]?.screened).toBe(false);
    }
    expect(registry.current.has("row-1")).toBe(true);

    act(() => clearScreenFailure("row-1"));
    expect(registry.current.has("row-1")).toBe(false);
  });
});

describe("useFailedScreenings", () => {
  it("re-renders with a new snapshot when a failure is noted or cleared", () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useFailedScreenings();
    });
    const before = result.current;
    const rendersBefore = renders;

    act(() => noteScreenFailure("img-a"));
    expect(result.current).not.toBe(before);
    expect(result.current.has("img-a")).toBe(true);
    expect(before.has("img-a")).toBe(false);
    expect(renders).toBeGreaterThan(rendersBefore);

    const noted = result.current;
    act(() => clearScreenFailure("img-a"));
    expect(result.current).not.toBe(noted);
    expect(result.current.has("img-a")).toBe(false);
  });
});

describe("screenImageWithRetry", () => {
  const invokeOk = { data: { ok: true }, error: null };
  const invokeFail = { data: null, error: { message: "503" } };

  function clientWithQueue(outcomes: Array<{ data: unknown; error: unknown }>) {
    let queue = outcomes;
    return createFakeClient({
      functions: {
        get "screen-image"() {
          const outcome = queue[0];
          queue = queue.slice(1);
          return outcome ?? { data: null, error: null };
        },
      },
    });
  }

  it("calls screen-image once when it succeeds", async () => {
    const fake = clientWithQueue([invokeOk]);
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(
      screenImageWithRetry(fake.client, "img-1", { sleep }),
    ).resolves.toBe(true);
    expect(fake.invokes).toEqual([
      { fn: "screen-image", options: { body: { imageId: "img-1" } } },
    ]);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries twice with the short backoff and then succeeds", async () => {
    const fake = clientWithQueue([invokeFail, invokeFail, invokeOk]);
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(
      screenImageWithRetry(fake.client, "img-1", { sleep }),
    ).resolves.toBe(true);
    expect(fake.invokes).toHaveLength(3);
    expect(sleep.mock.calls).toEqual([[400], [1200]]);
  });

  it("gives up after the two retries", async () => {
    const fake = clientWithQueue([invokeFail, invokeFail, invokeFail]);
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(
      screenImageWithRetry(fake.client, "img-1", { sleep }),
    ).resolves.toBe(false);
    expect(fake.invokes).toHaveLength(3);
    expect(sleep.mock.calls).toEqual([[400], [1200]]);
  });
});

describe("isStalePending", () => {
  const now = Date.parse("2026-11-19T12:00:00.000Z");

  it("is false for a fresh upload and a missing timestamp", () => {
    expect(isStalePending("2026-11-19T11:00:00.000Z", now)).toBe(false);
    expect(isStalePending(null, now)).toBe(false);
  });

  it("is true once a day has passed without a screening", () => {
    expect(isStalePending("2026-11-18T12:01:00.000Z", now)).toBe(false);
    expect(isStalePending("2026-11-18T12:00:00.000Z", now)).toBe(true);
    expect(isStalePending("2026-11-18T09:00:00.000Z", now)).toBe(true);
  });

  it("ignores unparseable timestamps", () => {
    expect(isStalePending("not a date", now)).toBe(false);
  });
});

describe("useRetryScreenImage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
  });

  it("screens again and forgets the failure on success", async () => {
    noteScreenFailure("img-1");
    const fake = createFakeClient({
      functions: { "screen-image": { data: { ok: true }, error: null } },
    });
    const { result: registry } = renderHook(() => useFailedScreenings());
    expect(registry.current.has("img-1")).toBe(true);

    const result = await runMutation(
      () => useRetryScreenImage(fake.client),
      "img-1",
    );
    expect(result?.ok).toBe(true);
    expect(registry.current.has("img-1")).toBe(false);
    expect(fake.invokes).toEqual([
      { fn: "screen-image", options: { body: { imageId: "img-1" } } },
    ]);
  });

  it("keeps the failure when every retry fails", async () => {
    noteScreenFailure("img-1");
    const fake = createFakeClient({
      functions: { "screen-image": { data: null, error: { message: "503" } } },
    });
    const result = await runMutation(
      () => useRetryScreenImage(fake.client),
      "img-1",
    );
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.error.code).toBe("unknown");
    }
  });
});

describe("useRemovePendingImage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
  });

  it("deletes the row and forgets the failure", async () => {
    noteScreenFailure("img-1");
    const fake = createFakeClient({
      resolve: (record) =>
        record.isDelete
          ? { data: [{ id: "img-1" }], error: null }
          : { data: [], error: null },
    });
    const { result: registry } = renderHook(() => useFailedScreenings());

    const result = await runMutation(
      () => useRemovePendingImage(fake.client),
      "img-1",
    );
    expect(result?.ok).toBe(true);
    expect(registry.current.has("img-1")).toBe(false);
    const deleteRecord = fake.records.find((record) => record.isDelete);
    expect(deleteRecord).toBeDefined();
    expect(deleteRecord?.eqFilters).toContainEqual(["id", "img-1"]);
    expect(deleteRecord?.eqFilters).toContainEqual(["author_id", "user-1"]);
    expect(deleteRecord?.eqFilters).toContainEqual(["status", "pending"]);
  });

  it("reports forbidden when the server deletes nothing", async () => {
    const fake = createFakeClient({
      resolve: (record) =>
        record.isDelete ? { data: [], error: null } : { data: [], error: null },
    });
    const result = await runMutation(
      () => useRemovePendingImage(fake.client),
      "img-1",
    );
    expectFailed(result, "forbidden");
  });
});
