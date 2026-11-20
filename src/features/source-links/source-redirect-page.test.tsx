import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { SourceRedirectPage } from "@/features/source-links/source-redirect-page";
import { track } from "@/lib/telemetry/analytics";

vi.mock("@/lib/telemetry/analytics", () => ({
  track: vi.fn(),
}));

const trackMock = vi.mocked(track);

function renderFrom(source: string) {
  const router = createMemoryRouter(
    [
      { path: "/from/:source", element: <SourceRedirectPage /> },
      { path: "/", element: <p>Home marker</p> },
    ],
    { initialEntries: [`/from/${source}`] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("SourceRedirectPage", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it.each(["tiktok", "shorts", "reels", "reddit", "bluesky", "note"])(
    "records %s and redirects home",
    async (source) => {
      renderFrom(source);

      await screen.findByText("Home marker");

      expect(trackMock).toHaveBeenCalledTimes(1);
      expect(trackMock).toHaveBeenCalledWith("source_visit", { source });
    },
  );

  it("redirects an unknown source without recording anything", async () => {
    renderFrom("definitely-not-a-platform");

    await screen.findByText("Home marker");

    expect(trackMock).not.toHaveBeenCalled();
  });

  it("never renders visible content of its own", async () => {
    const { container } = renderFrom("tiktok");

    await waitFor(() =>
      expect(screen.getByText("Home marker")).toBeInTheDocument(),
    );

    expect(container.textContent).toBe("Home marker");
  });
});
