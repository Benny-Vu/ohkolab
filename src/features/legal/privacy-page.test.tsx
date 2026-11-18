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
    expect(screen.getByText(/no advertising/i)).toBeInTheDocument();
    expect(
      screen.getByText(/cookieless usage statistics and crash reports/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/email address/)).toBeInTheDocument();
  });

  it("shows the contact email and links to the terms and profile pages", () => {
    renderPrivacyPage();

    const emailLinks = screen.getAllByRole("link", { name: CONTACT_EMAIL });
    expect(emailLinks).toHaveLength(2);
    for (const link of emailLinks) {
      expect(link).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    }
    expect(
      screen.getByRole("link", { name: "terms of service" }),
    ).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "profile page" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });

  it("describes telemetry, renders the opt-out switch and links the providers", () => {
    renderPrivacyPage();

    expect(
      screen.getByRole("heading", {
        name: "Crash reports and usage statistics",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Feedback" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", {
        name: /share anonymous usage statistics and crash reports/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "privacy policy" }).length,
    ).toBeGreaterThanOrEqual(2);
    const policyLinks = screen
      .getAllByRole("link", { name: "privacy policy" })
      .map((link) => link.getAttribute("href"));
    expect(policyLinks).toContain("https://sentry.io/privacy/");
    expect(policyLinks).toContain("https://posthog.com/privacy/");
  });

  it("names the operator and offers a table of contents", () => {
    renderPrivacyPage();

    expect(screen.getByText(/Vu Forge \(Benny Vu\)/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Who runs OHKOLab" }),
    ).toBeInTheDocument();

    const toc = screen.getByRole("navigation", { name: "On this page" });
    expect(toc).toBeInTheDocument();
    expect(
      screen
        .getByRole("link", { name: "Crash reports and usage statistics" })
        .getAttribute("href"),
    ).toBe("#telemetry");
  });
});
