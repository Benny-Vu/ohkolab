import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileMessageButton } from "@/features/messages/profile-message-button";
import { createFakeAuth, renderAt } from "@/features/messages/test-utils";
import { createFakeClient } from "@/lib/messages/test-client";
import type { AuthContextValue } from "@/lib/auth/types";

const ME = "user-1";
const OTHER = { id: "user-2" };

function buttonClient(
  canMessage: boolean,
  startError?: { code: string; message: string },
) {
  return createFakeClient({
    resolve: () => ({ data: [], error: null }),
    rpc: {
      can_message: { data: canMessage, error: null },
      start_conversation: startError
        ? { data: null, error: startError }
        : { data: "conv-9", error: null },
    },
  });
}

describe("ProfileMessageButton with the flag off", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing and never asks the server", async () => {
    const fake = buttonClient(true);
    renderAt(
      <ProfileMessageButton profile={OTHER} client={fake.client} />,
      createFakeAuth(),
      { path: "/messages" },
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.rpcCalls).toEqual([]);
    expect(
      screen.queryByRole("button", { name: "Message" }),
    ).not.toBeInTheDocument();
  });
});

describe("ProfileMessageButton with the flag on", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays hidden while the server says no", async () => {
    const fake = buttonClient(false);
    renderAt(
      <ProfileMessageButton profile={OTHER} client={fake.client} />,
      createFakeAuth(),
      { path: "/messages" },
    );
    await waitFor(() =>
      expect(fake.rpcCalls).toContainEqual({
        fn: "can_message",
        args: { other: OTHER.id },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      screen.queryByRole("button", { name: "Message" }),
    ).not.toBeInTheDocument();
  });

  it("appears when the server allows it and opens the thread", async () => {
    const fake = buttonClient(true);
    renderAt(
      <ProfileMessageButton profile={OTHER} client={fake.client} />,
      createFakeAuth(),
      { path: "/messages" },
    );
    const button = await screen.findByRole("button", { name: "Message" });
    const user = userEvent.setup();
    await user.click(button);
    await waitFor(() =>
      expect(fake.rpcCalls).toContainEqual({
        fn: "start_conversation",
        args: { other: OTHER.id },
      }),
    );
    // The thread route renders its placeholder content after navigation.
    await waitFor(() =>
      expect(screen.getByText("thread content")).toBeInTheDocument(),
    );
  });

  it("never shows for the signed-in player's own profile", async () => {
    const fake = buttonClient(true);
    renderAt(
      <ProfileMessageButton profile={{ id: ME }} client={fake.client} />,
      createFakeAuth(),
      { path: "/messages" },
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      screen.queryByRole("button", { name: "Message" }),
    ).not.toBeInTheDocument();
  });

  it("shows the friendly rate-limit message when starting fails", async () => {
    const fake = buttonClient(true, {
      code: "P0A08",
      message: "Too many new conversations today",
    });
    renderAt(
      <ProfileMessageButton profile={OTHER} client={fake.client} />,
      createFakeAuth(),
      { path: "/messages" },
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Message" }));
    expect(
      await screen.findByText(
        "You are posting too quickly. Wait a few minutes and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("renders nothing for a guest", async () => {
    const fake = buttonClient(true);
    const guest = {
      ...createFakeAuth(),
      user: null,
      session: null,
      profile: null,
    } as unknown as AuthContextValue;
    renderAt(
      <ProfileMessageButton profile={OTHER} client={fake.client} />,
      guest,
      { path: "/messages" },
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.rpcCalls).toEqual([]);
  });
});
