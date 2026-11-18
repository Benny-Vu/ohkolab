import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { NotFoundPage } from "@/features/system/not-found-page";

function renderNotFound() {
  const router = createMemoryRouter(
    [
      { path: "/", element: <div data-testid="home-stub" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
    { initialEntries: ["/nowhere"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("NotFoundPage", () => {
  it("shows the 404 heading and a way back home", async () => {
    const user = userEvent.setup();
    renderNotFound();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Back to home" }));
    expect(await screen.findByTestId("home-stub")).toBeInTheDocument();
  });
});
