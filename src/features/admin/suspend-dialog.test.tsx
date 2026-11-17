import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SuspendDialog } from "@/features/admin/suspend-dialog";
import { suspendUntil } from "@/lib/social/moderation";
import type { AppSupabaseClient } from "@/lib/supabase";

const moderationMocks = vi.hoisted(() => ({
  useSuspendUser: vi.fn(),
}));

vi.mock("@/lib/social/moderation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/social/moderation")>();
  return {
    ...actual,
    useSuspendUser: moderationMocks.useSuspendUser,
  };
});

const mutationResult = (
  mutateAsync: (...args: never[]) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
  isPending = false,
) => ({ mutateAsync, mutate: vi.fn(), isPending });

const fakeClient = { from: () => null } as unknown as AppSupabaseClient;

function renderDialog(
  props: Partial<Parameters<typeof SuspendDialog>[0]> = {},
) {
  return render(
    <SuspendDialog
      userId="user-2"
      client={fakeClient}
      open
      onOpenChange={vi.fn()}
      {...props}
    />,
  );
}

describe("suspendUntil", () => {
  it("returns an ISO date the given number of days ahead", () => {
    const before = Date.now();
    const until = suspendUntil(7);
    const after = Date.now();

    const expectedMin = before + 7 * 86_400_000;
    const expectedMax = after + 7 * 86_400_000;
    const value = new Date(until).getTime();
    expect(value).toBeGreaterThanOrEqual(expectedMin);
    expect(value).toBeLessThanOrEqual(expectedMax);
  });

  it("treats permanent as roughly 100 years", () => {
    const until = new Date(suspendUntil(36_500)).getTime();
    const years = (until - Date.now()) / (365 * 86_400_000);
    expect(years).toBeGreaterThan(99);
    expect(years).toBeLessThan(101);
  });
});

describe("SuspendDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moderationMocks.useSuspendUser.mockReturnValue(mutationResult());
  });

  it("disables every duration until a reason is written", async () => {
    const user = userEvent.setup();
    renderDialog();

    const buttons = ["1 day", "7 days", "30 days", "Permanent"].map((name) =>
      screen.getByRole("button", { name: new RegExp(name, "i") }),
    );
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }

    await user.type(
      screen.getByLabelText(/reason for the suspension/i),
      "Repeated spam",
    );
    for (const button of buttons) {
      expect(button).toBeEnabled();
    }
  });

  it("suspends for the chosen duration", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn<
      (input: {
        userId: string;
        until: string;
        reason: string;
      }) => Promise<{ ok: true; data: undefined }>
    >(async () => ({ ok: true, data: undefined }));
    moderationMocks.useSuspendUser.mockReturnValue(mutationResult(mutateAsync));
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    await user.type(
      screen.getByLabelText(/reason for the suspension/i),
      "Repeated spam",
    );
    await user.click(screen.getByRole("button", { name: /7 days/i }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    const call = mutateAsync.mock.calls[0]![0];
    expect(call.userId).toBe("user-2");
    expect(call.reason).toBe("Repeated spam");
    const days = (new Date(call.until).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("suspends permanently with a far-future date", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn<
      (input: {
        userId: string;
        until: string;
        reason: string;
      }) => Promise<{ ok: true; data: undefined }>
    >(async () => ({ ok: true, data: undefined }));
    moderationMocks.useSuspendUser.mockReturnValue(mutationResult(mutateAsync));
    renderDialog();

    await user.type(
      screen.getByLabelText(/reason for the suspension/i),
      "Ban evasion",
    );
    await user.click(screen.getByRole("button", { name: /permanent/i }));

    const call = mutateAsync.mock.calls[0]![0];
    const years = (new Date(call.until).getTime() - Date.now()) / 86_400_000;
    expect(years).toBeGreaterThan(36_000);
  });

  it("keeps the dialog open when the suspension fails", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({
      ok: false,
      error: { message: "Not allowed" },
    }));
    const onOpenChange = vi.fn();
    moderationMocks.useSuspendUser.mockReturnValue(mutationResult(mutateAsync));
    renderDialog({ onOpenChange });

    await user.type(
      screen.getByLabelText(/reason for the suspension/i),
      "Repeated spam",
    );
    await user.click(screen.getByRole("button", { name: /1 day/i }));

    expect(mutateAsync).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
