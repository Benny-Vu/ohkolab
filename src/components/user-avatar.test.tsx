import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserAvatar } from "@/components/user-avatar";

describe("UserAvatar", () => {
  it("renders the user's Pokémon when an avatar species is set", async () => {
    // The sprite component is lazy so the heavy data chunks stay off the
    // startup path; the icon replaces the initials once it loads.
    render(
      <UserAvatar
        username="ashketchum"
        displayName="Ash"
        avatarSpecies="Pikachu"
        size="md"
      />,
    );

    expect(screen.getByText("A")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Pikachu" })).toBeInTheDocument();
    });
  });

  it("falls back to the display name initial on a tinted circle", () => {
    render(<UserAvatar username="misty" displayName="Misty" size="md" />);

    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("uses the username initial when there is no display name", () => {
    render(<UserAvatar username="tracey" size="sm" />);

    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows a question mark for an empty username", () => {
    render(<UserAvatar username="" size="sm" />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("ignores a blank display name and uses the username", () => {
    render(<UserAvatar username="brock" displayName="  " size="lg" />);

    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("renders the same tint for the same username", () => {
    const { container: first } = render(
      <UserAvatar username="misty" size="sm" />,
    );
    const { container: second } = render(
      <UserAvatar username="misty" size="lg" />,
    );

    const firstClasses = first.firstElementChild!.className;
    const secondClasses = second.firstElementChild!.className;
    for (const tint of ["chart-2", "chart-3", "chart-4", "chart-5"]) {
      if (firstClasses.includes(tint)) {
        expect(secondClasses).toContain(tint);
      }
    }
  });
});
