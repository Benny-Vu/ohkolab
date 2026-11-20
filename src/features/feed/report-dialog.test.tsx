import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportDialog } from "@/features/feed/report-dialog";
import { createFakeAuth } from "@/features/account/test-utils";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";

const mutationsMocks = vi.hoisted(() => ({
  useCreateReport: vi.fn(),
}));

vi.mock("@/lib/social/mutations", () => mutationsMocks);

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function renderDialog(
  auth: ReturnType<typeof createFakeAuth> | typeof GUEST_AUTH,
  props: Partial<Parameters<typeof ReportDialog>[0]> = {},
) {
  return render(
    <AuthContext.Provider value={auth}>
      <ReportDialog
        open
        onOpenChange={vi.fn()}
        targetType="post"
        targetId="post-1"
        {...props}
      />
    </AuthContext.Provider>,
  );
}

describe("ReportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationsMocks.useCreateReport.mockReturnValue(mutationResult());
  });

  it("shows the report form when signed in", () => {
    renderDialog(createFakeAuth());

    expect(screen.getByLabelText(/report reason/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /report by email/i }),
    ).not.toBeInTheDocument();
  });

  it("submits a report when signed in", async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreateReport.mockReturnValue(mutationResult(create));
    renderDialog(createFakeAuth());

    await user.click(screen.getByRole("combobox", { name: /report reason/i }));
    await user.click(screen.getByRole("option", { name: /spam/i }));
    await user.click(screen.getByRole("button", { name: /send report/i }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "post",
        targetId: "post-1",
        reason: "spam",
      }),
    );
  });

  it("shows a report by email link when signed out", () => {
    renderDialog(GUEST_AUTH);

    const link = screen.getByRole("link", { name: /report by email/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:contact@ohkolab.com"),
    );
    expect(screen.queryByLabelText(/report reason/i)).not.toBeInTheDocument();
  });

  it("names the content type in the email subject", () => {
    renderDialog(GUEST_AUTH, { targetType: "comment" });

    const link = screen.getByRole("link", { name: /report by email/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain(encodeURIComponent("Report a comment"));
  });

  it("names profiles in the email subject", () => {
    renderDialog(GUEST_AUTH, { targetType: "profile" });

    const link = screen.getByRole("link", { name: /report by email/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain(encodeURIComponent("Report a profile"));
  });

  it("includes the post url in the email body", () => {
    renderDialog(GUEST_AUTH, { targetType: "post", targetId: "post-42" });

    const link = screen.getByRole("link", { name: /report by email/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain(
      encodeURIComponent(`${window.location.origin}/post/post-42`),
    );
  });

  it("includes the profile url in the email body", () => {
    renderDialog(GUEST_AUTH, {
      targetType: "profile",
      targetId: "misty",
    });

    const link = screen.getByRole("link", { name: /report by email/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain(
      encodeURIComponent(`${window.location.origin}/u/misty`),
    );
  });

  it("includes the current page url for comments", () => {
    renderDialog(GUEST_AUTH, { targetType: "comment", targetId: "comment-1" });

    const link = screen.getByRole("link", { name: /report by email/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain(
      encodeURIComponent(
        `${window.location.origin}${window.location.pathname}`,
      ),
    );
  });
});
