import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import type { PostImageDisplay } from "@/lib/social/images";
import { PostImageGrid } from "@/features/feed/post-images";
import { createQueryClient } from "@/lib/social/test-client";

// The retry and remove mutations are network calls; the grid only needs to
// hand them the image id when the author clicks. Everything else (the
// failure registry, the stale check) stays real.
const retryMutate = vi.fn();
const removeMutate = vi.fn();
vi.mock("@/lib/social/images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/social/images")>();
  return {
    ...actual,
    useRetryScreenImage: () => ({ mutate: retryMutate, isPending: false }),
    useRemovePendingImage: () => ({ mutate: removeMutate, isPending: false }),
  };
});

const { noteScreenFailure, clearAllScreenFailures } =
  await import("@/lib/social/images");

afterAll(() => {
  clearAllScreenFailures();
});

/** The grid mounts mutation hooks, so it needs the query client provider. */
function renderGrid(images: PostImageDisplay[]) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <PostImageGrid images={images} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function approved(partial: Partial<PostImageDisplay> = {}): PostImageDisplay {
  return {
    id: "img-1",
    status: "approved",
    url: "https://img.ohkolab.com/user-1/post-1/img-1.webp",
    alt: "A Garchomp on the beach",
    width: 1600,
    height: 900,
    pendingSince: null,
    ...partial,
  };
}

function pending(partial: Partial<PostImageDisplay> = {}): PostImageDisplay {
  return {
    id: "img-2",
    status: "pending",
    url: null,
    alt: null,
    width: null,
    height: null,
    pendingSince: new Date().toISOString(),
    ...partial,
  };
}

function rejected(): PostImageDisplay {
  return {
    id: "img-3",
    status: "rejected",
    url: null,
    alt: null,
    width: null,
    height: null,
    pendingSince: null,
  };
}

describe("PostImageGrid", () => {
  it("renders a single approved image with its alt text", () => {
    renderGrid([approved()]);

    const image = screen.getByRole("img", { name: "A Garchomp on the beach" });
    expect(image).toHaveAttribute(
      "src",
      "https://img.ohkolab.com/user-1/post-1/img-1.webp",
    );
  });

  it("renders two approved images side by side", () => {
    renderGrid([approved({ id: "img-1" }), approved({ id: "img-2" })]);

    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("falls back to a numbered alt text when there is none", () => {
    renderGrid([approved({ alt: null })]);

    expect(screen.getByRole("img", { name: "Image 1" })).toBeInTheDocument();
  });

  it("opens the lightbox on tap and closes it with Escape", async () => {
    const user = userEvent.setup();
    renderGrid([approved()]);

    await user.click(screen.getByRole("button", { name: "Open image 1" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      screen.getByRole("img", { name: "A Garchomp on the beach" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent("A Garchomp on the beach");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the lightbox when the image itself is clicked", async () => {
    const user = userEvent.setup();
    renderGrid([approved({ alt: null })]);

    await user.click(screen.getByRole("button", { name: "Open image 1" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close image" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the author's checking notice for fresh pending images", () => {
    renderGrid([approved(), pending()]);

    expect(screen.getByText("Checking image…")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("offers retry when this session's screening failed", async () => {
    const user = userEvent.setup();
    noteScreenFailure("img-2");
    renderGrid([pending()]);

    expect(screen.getByText("Couldn't check this image.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retryMutate).toHaveBeenCalledWith(
      "img-2",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(removeMutate).not.toHaveBeenCalled();
  });

  it("offers removal for an image stuck pending for a day", async () => {
    const user = userEvent.setup();
    const stuckSince = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    renderGrid([pending({ id: "img-stuck", pendingSince: stuckSince })]);

    expect(
      screen.getByText("This image couldn't be checked."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove image" }));
    expect(removeMutate).toHaveBeenCalledWith(
      "img-stuck",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(retryMutate).not.toHaveBeenCalled();
    // The retry offer stays hidden for stuck images.
    expect(
      screen.queryByText("Couldn't check this image."),
    ).not.toBeInTheDocument();
  });

  it("links the author's rejection notice to the notifications list", () => {
    renderGrid([rejected()]);

    expect(
      screen.getByText(/Image removed by automatic screening/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See the notice" }),
    ).toHaveAttribute("href", "/notifications");
  });

  it("renders nothing when there is nothing to show", () => {
    const { container } = renderGrid([]);
    expect(container).toBeEmptyDOMElement();
  });
});
