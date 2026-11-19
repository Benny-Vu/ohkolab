import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createDefaultSet } from "@/data";
import { createFakeAuth } from "@/features/account/test-utils";
import { Composer } from "@/features/feed/composer";
import { IMAGE_ALT_MAX, IMAGE_POSTS_MAX } from "@/lib/social/images";
import { TEAMS_STORAGE_KEY } from "@/lib/team";
import type { Team } from "@/types/team";

const mutationsMocks = vi.hoisted(() => ({
  useCreatePost: vi.fn(),
}));

const imagesMocks = vi.hoisted(() => ({
  prepareImage: vi.fn(),
  useAttachPostImages: vi.fn(),
}));

vi.mock("@/lib/social/mutations", () => mutationsMocks);

vi.mock("@/lib/social/images", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/social/images")>()),
  prepareImage: imagesMocks.prepareImage,
  useAttachPostImages: imagesMocks.useAttachPostImages,
}));

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function seedTeam(name: string): Team {
  const team: Team = {
    id: "team-1",
    name,
    format: "doubles",
    members: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
  localStorage.setItem(
    TEAMS_STORAGE_KEY,
    JSON.stringify({ version: 1, teams: [team] }),
  );
  return team;
}

function renderComposer(auth = createFakeAuth()) {
  return render(
    <Providers>
      <AuthContext.Provider value={auth}>
        <Composer />
      </AuthContext.Provider>
    </Providers>,
  );
}

describe("Composer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mutationsMocks.useCreatePost.mockReturnValue(mutationResult());
    imagesMocks.useAttachPostImages.mockReturnValue(mutationResult());
  });

  it("disables the post button until the body is filled", async () => {
    const user = userEvent.setup();
    renderComposer();

    const textarea = screen.getByRole("textbox", { name: "Write a post" });
    const postButton = screen.getByRole("button", { name: /^post$/i });
    expect(postButton).toBeDisabled();

    await user.type(textarea, "Hello world");

    expect(postButton).toBeEnabled();
    expect(screen.getByText("11/2000")).toBeInTheDocument();
  });

  it("submits the post and clears the form", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreatePost.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderComposer();

    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "Hello world",
    );
    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        body: "Hello world",
        attachment: null,
        groupId: null,
        language: "en",
      }),
    );
    expect(screen.getByRole("textbox", { name: "Write a post" })).toHaveValue(
      "",
    );
  });

  it("tags the post with the picked language", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreatePost.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderComposer();

    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "こんにちは",
    );
    await user.click(screen.getByRole("combobox", { name: "Post language" }));
    await user.click(await screen.findByRole("option", { name: "日本語" }));

    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        body: "こんにちは",
        attachment: null,
        groupId: null,
        language: "ja",
      }),
    );
  });

  it("attaches a team and sends it with the post", async () => {
    const user = userEvent.setup();
    seedTeam("Champion team");
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreatePost.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderComposer();

    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "Check this team",
    );
    await user.click(screen.getByRole("combobox", { name: "Attach a team" }));
    await user.click(
      await screen.findByRole("option", { name: "Champion team" }),
    );

    expect(
      screen.getByText('Team "Champion team" will be attached to this post.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          body: "Check this team",
          attachment: expect.objectContaining({
            kind: "team",
            name: "Champion team",
          }),
        }),
      ),
    );
  });

  it("shows the selected team as a preview before posting", async () => {
    const user = userEvent.setup();
    const team: Team = {
      id: "team-1",
      name: "Champion team",
      format: "doubles",
      members: [createDefaultSet("Garchomp")],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };
    localStorage.setItem(
      TEAMS_STORAGE_KEY,
      JSON.stringify({ version: 1, teams: [team] }),
    );
    renderComposer();

    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "Check this team",
    );
    await user.click(screen.getByRole("combobox", { name: "Attach a team" }));
    await user.click(
      await screen.findByRole("option", { name: "Champion team" }),
    );

    // The selected team shows as a preview: its Pokémon and its empty slots.
    expect(screen.getByRole("img", { name: "Garchomp" })).toBeInTheDocument();
    expect(
      screen.getByRole("list", {
        name: 'Team "Champion team" will be attached to this post.',
      }),
    ).toBeInTheDocument();
  });

  it("shows the error message when posting fails", async () => {
    const user = userEvent.setup();
    mutationsMocks.useCreatePost.mockReturnValue(
      mutationResult(async () => ({
        ok: false,
        error: {
          code: "rate_limited",
          message:
            "You are posting too quickly. Wait a few minutes and try again.",
        },
      })),
    );
    renderComposer();

    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "Hello world",
    );
    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/you are posting too quickly/i),
      ).toBeInTheDocument(),
    );
  });
});

/** jsdom has no object URLs; give every preview a stable fake. */
function stubObjectUrls() {
  let counter = 0;
  Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:preview-${++counter}`),
    revokeObjectURL: vi.fn(),
  });
}

function imageFile(name: string, type = "image/png"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

function stubPrepareImage() {
  imagesMocks.prepareImage.mockImplementation(async () => ({
    ok: true,
    data: {
      blob: { type: "image/webp", size: 1234 } as unknown as Blob,
      width: 1600,
      height: 900,
    },
  }));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Composer images", () => {
  /** Focuses the textarea to expand the composer, then returns the picker. */
  const openFilePicker = async (
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<HTMLInputElement> => {
    await user.click(screen.getByRole("textbox", { name: "Write a post" }));
    return screen.getByLabelText("Choose images") as HTMLInputElement;
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    stubObjectUrls();
    mutationsMocks.useCreatePost.mockReturnValue(mutationResult());
    imagesMocks.useAttachPostImages.mockReturnValue(mutationResult());
    stubPrepareImage();
  });

  it("hides the Add images button while the flag is off", () => {
    renderComposer();

    expect(
      screen.queryByRole("button", { name: /add images/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the Add images button for signed-out users", () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    renderComposer(createFakeAuth({ user: null }));

    expect(
      screen.queryByRole("button", { name: /add images/i }),
    ).not.toBeInTheDocument();
  });

  it("adds chosen files as thumbnails with descriptions", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    const user = userEvent.setup();
    renderComposer();

    await user.upload(await openFilePicker(user), [
      imageFile("one.png"),
      imageFile("two.png"),
    ]);

    expect(await screen.findByLabelText("Describe image 1")).toHaveValue("");
    expect(screen.getByLabelText("Describe image 2")).toHaveValue("");
    expect(screen.getAllByRole("img", { name: /image \d/i })).toHaveLength(2);
  });

  it("keeps spaces typed into an image description", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    const user = userEvent.setup();
    renderComposer();

    await user.upload(await openFilePicker(user), [imageFile("one.png")]);
    const description = await screen.findByLabelText("Describe image 1");
    await user.type(description, "Garchomp vs Incineroar ");

    expect(description).toHaveValue("Garchomp vs Incineroar ");
  });

  it("rejects more than four images", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    const user = userEvent.setup();
    renderComposer();

    await user.upload(
      await openFilePicker(user),
      Array.from({ length: 5 }, (_, index) => imageFile(`file-${index}.png`)),
    );

    expect(
      await screen.findByText(
        `A post can have at most ${IMAGE_POSTS_MAX} images.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /image \d/i })).toHaveLength(
      IMAGE_POSTS_MAX,
    );
  });

  it("rejects files prepareImage refuses, with their message", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    imagesMocks.prepareImage.mockImplementation(async () => ({
      ok: false,
      error: { code: "invalid_input", message: "That file is not an image." },
    }));
    const user = userEvent.setup();
    renderComposer();

    await user.upload(await openFilePicker(user), [
      imageFile("not-really-an-image.png"),
    ]);

    expect(
      await screen.findByText("That file is not an image."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Describe image 1")).not.toBeInTheDocument();
  });

  it("rejects over-15 MB files before decoding", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    imagesMocks.prepareImage.mockImplementation(async () => ({
      ok: false,
      error: {
        code: "invalid_input",
        message: "Images must be under 15 MB. Pick a smaller file.",
      },
    }));
    const user = userEvent.setup();
    renderComposer();

    await user.upload(await openFilePicker(user), [imageFile("huge.png")]);

    expect(
      await screen.findByText(
        "Images must be under 15 MB. Pick a smaller file.",
      ),
    ).toBeInTheDocument();
    expect(imagesMocks.prepareImage).toHaveBeenCalledTimes(1);
  });

  it("caps the description at 300 characters", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    const user = userEvent.setup();
    renderComposer();

    await user.upload(await openFilePicker(user), [imageFile("one.png")]);
    const description = await screen.findByLabelText("Describe image 1");
    await user.type(description, "x".repeat(IMAGE_ALT_MAX + 20));

    expect(description).toHaveValue("x".repeat(IMAGE_ALT_MAX));
  });

  it("removes and reorders the chosen images", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    const user = userEvent.setup();
    renderComposer();

    await user.upload(await openFilePicker(user), [
      imageFile("one.png"),
      imageFile("two.png"),
    ]);
    await screen.findByLabelText("Describe image 1");

    await user.click(
      screen.getByRole("button", { name: "Move image 1 right" }),
    );
    expect(screen.getByLabelText("Describe image 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove image 2" }));
    expect(
      screen.queryByRole("img", { name: "Image 2" }),
    ).not.toBeInTheDocument();
  });

  it("attaches the images after the post is created", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    const user = userEvent.setup();
    mutationsMocks.useCreatePost.mockReturnValue({
      mutateAsync: vi.fn(async () => ({
        ok: true,
        data: { id: "post-9", body: "Hello world" },
      })),
      mutate: vi.fn(),
      isPending: false,
    });
    const attachAsync = vi.fn(async () => ({
      ok: true,
      data: [
        {
          position: 0,
          uploaded: true,
          imageId: "row-1",
          screened: true,
          error: null,
        },
      ],
    }));
    imagesMocks.useAttachPostImages.mockReturnValue({
      mutateAsync: attachAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderComposer();

    await user.upload(await openFilePicker(user), [imageFile("one.png")]);
    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "With a picture",
    );
    await user.type(
      await screen.findByLabelText("Describe image 1"),
      "Garchomp",
    );
    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(attachAsync).toHaveBeenCalledWith({
        postId: "post-9",
        images: [
          expect.objectContaining({
            width: 1600,
            height: 900,
            alt: "Garchomp",
          }),
        ],
      }),
    );
    expect(
      await screen.findByText(
        /your images will appear once they have been checked/i,
      ),
    ).toBeInTheDocument();
    // The composer clears itself, images included.
    expect(screen.queryByLabelText("Describe image 1")).not.toBeInTheDocument();
  });

  it("leaves the image out with a toast when its upload fails", async () => {
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    const user = userEvent.setup();
    mutationsMocks.useCreatePost.mockReturnValue({
      mutateAsync: vi.fn(async () => ({
        ok: true,
        data: { id: "post-9", body: "Hello world" },
      })),
      mutate: vi.fn(),
      isPending: false,
    });
    imagesMocks.useAttachPostImages.mockReturnValue({
      mutateAsync: vi.fn(async () => ({
        ok: true,
        data: [
          {
            position: 0,
            uploaded: false,
            imageId: null,
            screened: false,
            error: {
              code: "unknown",
              message: "Something went wrong. Try again.",
            },
          },
        ],
      })),
      mutate: vi.fn(),
      isPending: false,
    });
    renderComposer();

    await user.upload(await openFilePicker(user), [imageFile("one.png")]);
    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "With a picture",
    );
    await user.click(screen.getByRole("button", { name: /^post$/i }));

    expect(
      await screen.findByText("Something went wrong. Try again."),
    ).toBeInTheDocument();
  });
});
