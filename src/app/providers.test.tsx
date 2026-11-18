import { render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";

describe("Providers", () => {
  it("mounts the toaster in the bottom-right corner", async () => {
    render(
      <Providers>
        <p>children render</p>
      </Providers>,
    );

    expect(screen.getByText("children render")).toBeInTheDocument();

    // Sonner renders nothing until the first toast exists.
    toast("Test toast");
    const toaster = await waitFor(() => {
      const node = document.querySelector<HTMLElement>("[data-sonner-toaster]");
      expect(node).not.toBeNull();
      return node!;
    });
    expect(toaster).toHaveAttribute("data-y-position", "bottom");
    expect(toaster).toHaveAttribute("data-x-position", "right");
  });
});
