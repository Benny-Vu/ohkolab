import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProfileBannerTint } from "@/features/profile/profile-banner-tint";

describe("ProfileBannerTint", () => {
  it("renders a tint band for a known species", async () => {
    const { container } = render(<ProfileBannerTint avatarSpecies="Pikachu" />);

    // The species lookup loads the Pokémon data layer lazily.
    await waitFor(() => {
      const band = container.querySelector(
        '[data-testid="profile-banner-tint"]',
      );
      expect(band).not.toBeNull();
      expect(band?.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("renders nothing without an avatar species", () => {
    const { container } = render(<ProfileBannerTint avatarSpecies={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an unknown species", () => {
    const { container } = render(
      <ProfileBannerTint avatarSpecies="Not a Pokemon" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
