import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "@/app/providers";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/features/legal/legal-info";
import { TermsPage } from "@/features/legal/terms-page";

beforeEach(() => {
  localStorage.clear();
});

function renderTermsPage() {
  const router = createMemoryRouter(
    [{ path: "/terms", element: <TermsPage /> }],
    {
      initialEntries: ["/terms"],
    },
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("TermsPage", () => {
  it("renders the terms of service", () => {
    renderTermsPage();

    expect(
      screen.getByRole("heading", { name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Last updated ${LAST_UPDATED}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Nintendo, Game Freak, Creatures or The Pokémon Company/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/at least 13 years old/)).toBeInTheDocument();
    expect(
      screen.getByText(/harasses, threatens or bullies other people/),
    ).toBeInTheDocument();
  });

  it("shows the contact email and links to the privacy policy", () => {
    renderTermsPage();

    const emailLinks = screen.getAllByRole("link", { name: CONTACT_EMAIL });
    expect(emailLinks).toHaveLength(2);
    for (const link of emailLinks) {
      expect(link).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    }
    expect(
      screen.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });
});
