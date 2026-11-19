import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { preloadEnglishDomains } from "@/lib/i18n/test-preload";
import { setLocale } from "@/lib/i18n/locale";

/**
 * The account deletion page (/delete-account): the public web address Google
 * Play requires for account-deletion requests. It must render in both
 * languages, state the deletion facts of the privacy policy, and be reachable
 * through the legal routes; the privacy page links to it.
 */

async function renderDeletePage(locale: "en" | "ja", flag = ""): Promise<void> {
  // The locale store persists to localStorage and the image-post list item is
  // decided at module load from the build flag, so each render stubs both and
  // re-imports the page.
  setLocale(locale);
  vi.resetModules();
  vi.stubEnv("VITE_IMAGE_POSTS", flag);
  // resetModules also resets the lazy English dictionary loader; preload
  // the fresh instance so the composed phrases render, as in production.
  await preloadEnglishDomains();
  const { DeleteAccountPage } =
    await import("@/features/legal/delete-account-page");
  const router = createMemoryRouter(
    [{ path: "/delete-account", element: <DeleteAccountPage /> }],
    { initialEntries: ["/delete-account"] },
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  setLocale("en");
});

describe("DeleteAccountPage", () => {
  it("renders the English page with the deletion facts", async () => {
    await renderDeletePage("en", "true");

    expect(
      screen.getByRole("heading", { name: "Delete your account" }),
    ).toBeInTheDocument();
    // Where the in-app control lives.
    expect(screen.getByText("Danger zone")).toBeInTheDocument();
    expect(screen.getByText("Delete account")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "profile page" })).toHaveAttribute(
      "href",
      "/profile",
    );
    // The email fallback.
    expect(
      screen.getByRole("link", { name: "contact@ohkolab.com" }),
    ).toHaveAttribute("href", "mailto:contact@ohkolab.com");
    // The facts from the privacy policy.
    expect(screen.getByText(/saved teams/)).toBeInTheDocument();
    expect(
      screen.getByText(/images you attached to posts/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Moderation records are an exception/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/12 months/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("leaves the image list item out when image posts are off", async () => {
    await renderDeletePage("en");

    expect(
      screen.queryByText(/images you attached to posts/),
    ).not.toBeInTheDocument();
  });

  it("renders the Japanese body when the locale is ja", async () => {
    await renderDeletePage("ja", "true");

    expect(
      screen.getByRole("heading", { name: "アカウントの削除" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("日本語版は参考訳です。正式な内容は英語版に準じます。"),
    ).toBeInTheDocument();
    expect(screen.getByText(/危険な操作/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "contact@ohkolab.com" }),
    ).toHaveAttribute("href", "mailto:contact@ohkolab.com");
    expect(screen.getByText(/12か月/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "プライバシーポリシー" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("is reachable through the legal routes", async () => {
    // Reset like the render helper: the locale store of an earlier re-import
    // would otherwise still hold its in-memory locale.
    setLocale("en");
    vi.resetModules();
    await preloadEnglishDomains();
    const { legalRoutes: routes } = await import("@/features/legal/routes");
    const router = createMemoryRouter(
      [
        {
          path: "/",
          hydrateFallbackElement: <p>Loading…</p>,
          children: routes,
        },
      ],
      { initialEntries: ["/delete-account"] },
    );
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );

    expect(
      await screen.findByRole("heading", { name: "Delete your account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "contact@ohkolab.com" }),
    ).toHaveAttribute("href", "mailto:contact@ohkolab.com");
  });

  it("links to the page from the privacy policy", async () => {
    setLocale("en");
    vi.resetModules();
    vi.stubEnv("VITE_IMAGE_POSTS", "true");
    await preloadEnglishDomains();
    const { PrivacyPage } = await import("@/features/legal/privacy-page");
    const router = createMemoryRouter(
      [{ path: "/privacy", element: <PrivacyPage /> }],
      { initialEntries: ["/privacy"] },
    );
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );

    expect(
      screen.getByRole("link", { name: "account deletion page" }),
    ).toHaveAttribute("href", "/delete-account");
  });
});
