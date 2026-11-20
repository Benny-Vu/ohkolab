import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { SaveImageButton, SaveImageDialog } from "@/features/share/save-image";
import { saveShareCard } from "@/lib/share-cards/save";

// The heavy half (fonts, sprites, canvas) is covered by its own tests; here
// the menu only needs to reach it with the right arguments. The mock also
// proves the lazy `import()` resolves the same module.
vi.mock("@/lib/share-cards/save", () => ({
  saveShareCard: vi.fn(),
}));

const cardContent = {
  kind: "team" as const,
  eyebrow: "Doubles · 6 Pokémon",
  heading: "Rain team",
  body: null,
  stat: null,
  species: [],
};

beforeEach(() => {
  vi.mocked(saveShareCard).mockReset();
  vi.mocked(saveShareCard).mockResolvedValue(undefined);
});

describe("SaveImageButton", () => {
  it("saves the chosen format and confirms with a toast", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <SaveImageButton content={cardContent} />
      </Providers>,
    );

    await user.click(screen.getByRole("button", { name: "Save as image" }));
    await user.click(await screen.findByText("Story 1080 × 1920"));

    expect(saveShareCard).toHaveBeenCalledWith(cardContent, "1080x1920");
    // findAllByText: sonner's module-level store replays earlier tests'
    // toasts into this test's Toaster, so the same text can appear twice.
    expect((await screen.findAllByText("Image saved.")).length).toBeGreaterThan(
      0,
    );
  });

  it("offers the landscape format too", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <SaveImageButton content={cardContent} />
      </Providers>,
    );

    await user.click(screen.getByRole("button", { name: "Save as image" }));
    await user.click(await screen.findByText("Landscape 1200 × 630"));

    expect(saveShareCard).toHaveBeenCalledWith(cardContent, "1200x630");
  });

  it("labels the icon-only trigger for screen readers", () => {
    render(
      <Providers>
        <SaveImageButton
          content={cardContent}
          iconOnly
          size="xs"
          variant="ghost"
        />
      </Providers>,
    );

    expect(
      screen.getByRole("button", { name: "Save as image" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Save as image")).not.toBeInTheDocument();
  });

  it("turns a failed save into an error toast", async () => {
    vi.mocked(saveShareCard).mockRejectedValue(new Error("render failed"));
    const user = userEvent.setup();
    render(
      <Providers>
        <SaveImageButton content={cardContent} />
      </Providers>,
    );

    await user.click(screen.getByRole("button", { name: "Save as image" }));
    await user.click(await screen.findByText("Story 1080 × 1920"));

    expect(
      await screen.findByText("The image could not be saved."),
    ).toBeInTheDocument();
  });
});

describe("SaveImageDialog", () => {
  it("saves the chosen format from the post card's format dialog", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <SaveImageDialog content={cardContent} open onOpenChange={() => {}} />
      </Providers>,
    );

    await user.click(await screen.findByText("Story 1080 × 1920"));

    expect(saveShareCard).toHaveBeenCalledWith(cardContent, "1080x1920");
    expect((await screen.findAllByText("Image saved.")).length).toBeGreaterThan(
      0,
    );
  });

  it("offers the landscape format too", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <SaveImageDialog content={cardContent} open onOpenChange={() => {}} />
      </Providers>,
    );

    await user.click(await screen.findByText("Landscape 1200 × 630"));

    expect(saveShareCard).toHaveBeenCalledWith(cardContent, "1200x630");
  });
});
