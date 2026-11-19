import { render, screen, within, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoadingArea, SKELETON_DELAY_MS } from "@/components/skeletons/index";
import { PostListSkeleton } from "@/components/skeletons/skeletons";

describe("LoadingArea", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the pending state out of the DOM for the grace window", () => {
    render(
      <LoadingArea
        pending={true}
        label="Loading posts"
        skeleton={<PostListSkeleton />}
      >
        <p>content</p>
      </LoadingArea>,
    );

    expect(screen.queryByText("content")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(document.querySelector('div[aria-busy="true"]')).toBeInTheDocument();
  });

  it("shows a labelled skeleton after the delay, then fades the content in", () => {
    const pending = render(
      <LoadingArea
        pending={true}
        label="Loading posts"
        skeleton={<PostListSkeleton />}
      >
        <p>content</p>
      </LoadingArea>,
    );

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
    });

    expect(
      pending.getByRole("status", { name: "Loading posts" }),
    ).toBeInTheDocument();
    expect(pending.queryByText("content")).not.toBeInTheDocument();

    // Fast loads skip the skeleton entirely and mount the content directly.
    const loaded = render(
      <LoadingArea
        pending={false}
        label="Loading posts"
        skeleton={<PostListSkeleton />}
      >
        <p>fresh content</p>
      </LoadingArea>,
    );
    expect(loaded.getByText("fresh content")).toBeInTheDocument();
    expect(
      within(loaded.container).queryByRole("status"),
    ).not.toBeInTheDocument();
  });

  it("renders children only once pending is false", () => {
    const { rerender } = render(
      <LoadingArea
        pending={true}
        label="Loading groups"
        skeleton={<PostListSkeleton />}
      >
        <p>the groups</p>
      </LoadingArea>,
    );

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
    });
    expect(screen.queryByText("the groups")).not.toBeInTheDocument();

    rerender(
      <LoadingArea
        pending={false}
        label="Loading groups"
        skeleton={<PostListSkeleton />}
      >
        <p>the groups</p>
      </LoadingArea>,
    );
    expect(screen.getByText("the groups")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing without children once pending ends (early-return sites)", () => {
    const { rerender } = render(
      <LoadingArea
        pending={true}
        label="Loading group"
        skeleton={<PostListSkeleton />}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS);
    });
    expect(
      screen.getByRole("status", { name: "Loading group" }),
    ).toBeInTheDocument();

    rerender(
      <LoadingArea
        pending={false}
        label="Loading group"
        skeleton={<PostListSkeleton />}
      />,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
