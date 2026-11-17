import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "@/app/providers";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/features/legal/legal-info";
import { PrivacyPage } from "@/features/legal/privacy-page";

beforeEach(() => {
  localStorage.clear();
});

function renderPrivacyPage() {
  const router = createMemoryRouter(
    [{ path: "/privacy", element: <PrivacyPage /> }],
    { initialEntries: ["/privacy"] },
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("PrivacyPage", () => {
  it("renders the privacy policy", () => {
    renderPrivacyPage();

    expect(
      screen.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Last updated ${LAST_UPDATED}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no advertising and no analytics/),
    ).toBeInTheDocument();
    expect(screen.getByText(/email address/)).toBeInTheDocument();
  });

  it("shows the contact email and links to the terms and profile pages", () => {
    renderPrivacyPage();

    expect(screen.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${CONTACT_EMAIL}`,
    );
    expect(
      screen.getByRole("link", { name: "terms of service" }),
    ).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "profile page" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });
});
