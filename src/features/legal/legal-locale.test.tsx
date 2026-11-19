import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { preloadEnglishDomains } from "@/lib/i18n/test-preload";
import { setLocale } from "@/lib/i18n/locale";

/**
 * The Japanese legal pages are a reference translation of the binding English
 * versions: they must make the same promises, section for section. This test
 * pins the two languages to the same section list, for both image-post flag
 * states — if the English page changes without the Japanese following, it
 * fails.
 */

async function renderPage(
  path: "/privacy" | "/terms",
  flag: string,
  locale: "en" | "ja",
): Promise<{ links: string[]; unmount: () => void }> {
  // The locale store persists to localStorage, and the pages' image-post
  // sections are decided at module load from the build flag, so each render
  // stubs both and re-imports the pages.
  setLocale(locale);
  vi.resetModules();
  vi.stubEnv("VITE_IMAGE_POSTS", flag);
  // resetModules also resets both lazy dictionary loaders; preload the
  // fresh instances so the composed phrases render, as in production.
  await preloadEnglishDomains();
  const { loadJapaneseDictionary } = await import("@/lib/i18n/ja-loader");
  await loadJapaneseDictionary();
  const { PrivacyPage } = await import("@/features/legal/privacy-page");
  const { TermsPage } = await import("@/features/legal/terms-page");
  const router = createMemoryRouter(
    [
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
    ],
    { initialEntries: [path] },
  );
  const { unmount, container } = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  // Scoped to this render's container: earlier mounts in the same test
  // (the other language) stay in the document until RTL cleans up.
  const links = Array.from(
    container.querySelectorAll<HTMLAnchorElement>("nav a[href^='#']"),
  ).map((anchor) => anchor.getAttribute("href") ?? "");
  return { links, unmount };
}

afterEach(() => {
  vi.unstubAllEnvs();
  setLocale("en");
});

describe("legal pages in both languages", () => {
  it.each([
    ["with image posts off", ""],
    ["with image posts on", "true"],
  ])("have the same terms sections %s", async (_label, flag) => {
    const en = await renderPage("/terms", flag, "en");
    const ja = await renderPage("/terms", flag, "ja");
    expect(ja.links).toEqual(en.links);
    expect(en.links).toContain("#operator");
    expect(en.links).toContain("#contact");
    if (flag === "true") {
      expect(en.links).toContain("#images");
    } else {
      expect(en.links).not.toContain("#images");
    }
  });

  it.each([
    ["with image posts off", ""],
    ["with image posts on", "true"],
  ])("have the same privacy sections %s", async (_label, flag) => {
    const en = await renderPage("/privacy", flag, "en");
    const ja = await renderPage("/privacy", flag, "ja");
    expect(ja.links).toEqual(en.links);
    expect(en.links).toContain("#operator");
    expect(en.links).toContain("#contact");
    if (flag === "true") {
      expect(en.links).toContain("#images");
    } else {
      expect(en.links).not.toContain("#images");
    }
  });

  it("renders the Japanese terms body when the locale is ja", async () => {
    await renderPage("/terms", "true", "ja");
    expect(
      screen.getByRole("heading", { name: "利用規約" }),
    ).toBeInTheDocument();
    // The heading also appears in the table of contents, so there are two.
    expect(screen.getAllByText(/非公式のファンプロジェクト/).length).toBe(2);
    expect(
      screen.getByText("日本語版は参考訳です。正式な内容は英語版に準じます。"),
    ).toBeInTheDocument();
  });

  it("renders the Japanese privacy body when the locale is ja", async () => {
    await renderPage("/privacy", "true", "ja");
    expect(
      screen.getByRole("heading", { name: "プライバシーポリシー" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Vu Forge（Benny Vu）/)).toBeInTheDocument();
    expect(screen.getByText(/言語設定/)).toBeInTheDocument();
  });

  it("renders the English body when the locale is en", async () => {
    await renderPage("/terms", "true", "en");
    expect(
      screen.getByRole("heading", { name: "Terms of Service" }),
    ).toBeInTheDocument();
    // Nav link, section heading and body text all match the phrase.
    expect(screen.getAllByText(/unofficial fan project/).length).toBe(3);
  });
});
