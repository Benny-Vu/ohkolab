import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import type { PostImageDisplay } from "@/lib/social/images";
import { PostImageGrid } from "@/features/feed/post-images";

function approved(partial: Partial<PostImageDisplay> = {}): PostImageDisplay {
  return {
    id: "img-1",
    status: "approved",
    url: "https://img.ohkolab.com/user-1/post-1/img-1.webp",
    alt: "A Garchomp on the beach",
    ...partial,
  };
}

function pending(): PostImageDisplay {
  return { id: "img-2", status: "pending", url: null, alt: null };
}

function rejected(): PostImageDisplay {
  return { id: "img-3", status: "rejected", url: null, alt: null };
}

describe("PostImageGrid", () => {
  it("renders a single approved image with its alt text", () => {
    render(<PostImageGrid images={[approved()]} />);

    const image = screen.getByRole("img", { name: "A Garchomp on the beach" });
    expect(image).toHaveAttribute(
      "src",
      "https://img.ohkolab.com/user-1/post-1/img-1.webp",
    );
  });

  it("renders two approved images side by side", () => {
    render(
      <PostImageGrid
        images={[approved({ id: "img-1" }), approved({ id: "img-2" })]}
      />,
    );

    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("falls back to a numbered alt text when there is none", () => {
    render(<PostImageGrid images={[approved({ alt: null })]} />);

    expect(screen.getByRole("img", { name: "Image 1" })).toBeInTheDocument();
  });

  it("opens the lightbox on tap and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<PostImageGrid images={[approved()]} />);

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
    render(<PostImageGrid images={[approved({ alt: null })]} />);

    await user.click(screen.getByRole("button", { name: "Open image 1" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close image" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the author's checking notice for pending images", () => {
    render(<PostImageGrid images={[approved(), pending()]} />);

    expect(screen.getByText("Checking image…")).toBeInTheDocument();
  });

  it("links the author's rejection notice to the notifications list", () => {
    render(
      <MemoryRouter>
        <PostImageGrid images={[rejected()]} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Image removed by automatic screening/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See the notice" }),
    ).toHaveAttribute("href", "/notifications");
  });

  it("renders nothing when there is nothing to show", () => {
    const { container } = render(<PostImageGrid images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
