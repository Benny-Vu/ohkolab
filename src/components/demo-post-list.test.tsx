import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { DemoPostList } from "@/components/demo-post-list";

describe("DemoPostList", () => {
  it("renders sample posts, each marked as an example", () => {
    render(
      <Providers>
        <DemoPostList />
      </Providers>,
    );

    // Every sample post carries the example tag.
    expect(screen.getAllByText("Example")).toHaveLength(3);
    expect(screen.getByText("@rikachu")).toBeInTheDocument();
    expect(
      screen.getByText(/New rain team is holding up in doubles/),
    ).toBeInTheDocument();
  });

  it("renders no like or comment buttons", () => {
    render(
      <Providers>
        <DemoPostList />
      </Providers>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
