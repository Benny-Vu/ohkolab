import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "@/app/providers";

// The image-post sections are decided when the page modules load, from the
// VITE_IMAGE_POSTS build flag, so each case stubs the flag and re-imports.
async function renderPage(path: "/privacy" | "/terms", flag: string) {
  vi.resetModules();
  vi.stubEnv("VITE_IMAGE_POSTS", flag);
  const { PrivacyPage } = await import("@/features/legal/privacy-page");
  const { TermsPage } = await import("@/features/legal/terms-page");
  const router = createMemoryRouter(
    [
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("image post legal text", () => {
  it("is hidden while image posts are off", async () => {
    await renderPage("/privacy", "");
    expect(
      screen.queryByRole("heading", { name: "Images in posts" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/OpenAI/)).not.toBeInTheDocument();
  });

  it("shows the privacy section when image posts are on", async () => {
    await renderPage("/privacy", "true");
    expect(
      screen.getByRole("heading", { name: "Images in posts" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/OpenAI/).length).toBeGreaterThan(0);
  });

  it("shows the terms section when image posts are on", async () => {
    await renderPage("/terms", "true");
    expect(
      screen.getByRole("heading", { name: "Images in posts" }),
    ).toBeInTheDocument();
    expect(screen.getByText("show violence or gore,")).toBeInTheDocument();
  });
});
