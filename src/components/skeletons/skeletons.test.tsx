import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingArea } from "@/components/skeletons/loading-area";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import {
  AvatarListSkeleton,
  CommentListSkeleton,
  ConversationListSkeleton,
  GroupListSkeleton,
  GroupMemberListSkeleton,
  GroupPageSkeleton,
  MetagameSkeleton,
  NotificationListSkeleton,
  PostListSkeleton,
  ProfilePageSkeleton,
  TeamDetailSkeleton,
  TeamGridSkeleton,
  TextLinesSkeleton,
  ThreadSkeleton,
} from "@/components/skeletons/skeletons";

/**
 * Every loading branch must announce itself to screen readers in both app
 * languages. The skeletons are decorative; the accessible name comes from
 * the `LoadingArea` wrapper, exactly how the feature pages compose them.
 */
const cases = [
  { name: "post list", skeleton: <PostListSkeleton /> },
  { name: "comment list", skeleton: <CommentListSkeleton /> },
  { name: "group list", skeleton: <GroupListSkeleton /> },
  { name: "group members", skeleton: <GroupMemberListSkeleton /> },
  { name: "group page", skeleton: <GroupPageSkeleton /> },
  { name: "profile page", skeleton: <ProfilePageSkeleton /> },
  { name: "team grid", skeleton: <TeamGridSkeleton /> },
  { name: "team detail", skeleton: <TeamDetailSkeleton /> },
  { name: "notifications", skeleton: <NotificationListSkeleton /> },
  { name: "conversations", skeleton: <ConversationListSkeleton /> },
  { name: "thread", skeleton: <ThreadSkeleton /> },
  { name: "metagame", skeleton: <MetagameSkeleton /> },
  { name: "page", skeleton: <PageSkeleton /> },
  { name: "avatar list", skeleton: <AvatarListSkeleton /> },
  { name: "text lines", skeleton: <TextLinesSkeleton /> },
];

const labels = {
  en: "Loading content",
  ja: "コンテンツを読み込み中",
};

describe("skeletons", () => {
  it.each(cases.map((entry) => [entry.name, entry.skeleton] as const))(
    "announces the loading state in English (%s)",
    async (_name, skeleton) => {
      render(
        <LoadingArea
          pending={true}
          label={labels.en}
          skeleton={skeleton}
          delayMs={0}
        >
          <p>content</p>
        </LoadingArea>,
      );

      const status = await screen.findByRole("status", { name: labels.en });
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByText("content")).not.toBeInTheDocument();
    },
  );

  it.each(cases.map((entry) => [entry.name, entry.skeleton] as const))(
    "announces the loading state in Japanese (%s)",
    async (_name, skeleton) => {
      render(
        <LoadingArea
          pending={true}
          label={labels.ja}
          skeleton={skeleton}
          delayMs={0}
        >
          <p>content</p>
        </LoadingArea>,
      );

      expect(
        await screen.findByRole("status", { name: labels.ja }),
      ).toBeInTheDocument();
    },
  );
});
