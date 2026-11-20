import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, LoaderCircleIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/error-state";
import {
  CommentListSkeleton,
  LoadingArea,
  PostCardSkeleton,
} from "@/components/skeletons";
import { Page } from "@/components/page";
import { NotFoundPage } from "@/features/system/not-found-page";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";
import {
  isPendingComment,
  useCreateComment,
  useDeleteComment,
} from "@/lib/social/mutations";
import { useComments, usePost } from "@/lib/social/queries";
import { usePostImages } from "@/lib/social/images";
import { COMMENT_BODY_MAX } from "@/lib/social/validation";
import { formatRelativeTime } from "@/features/feed/relative-time";
import { PostCard } from "@/features/feed/post-card";
import { ReportDialog } from "@/features/feed/report-dialog";

/**
 * Post detail: the post itself plus its comment thread. Signed-out visitors get
 * a sign-in prompt instead of the comment composer.
 */
export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const postQuery = usePost(postId ?? "");
  const commentsQuery = useComments(postId ?? "");
  const imagesQuery = usePostImages(postId ? [postId] : []);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const [commentBody, setCommentBody] = useState("");
  const [reportedCommentId, setReportedCommentId] = useState<string | null>(
    null,
  );
  const commentsHeadingRef = useRef<HTMLHeadingElement>(null);

  if (postQuery.isPending) {
    return (
      <Page title={t("postDetail.title")} width="narrow">
        <LoadingArea
          pending
          label={t("postDetail.loadingAria")}
          skeleton={<PostCardSkeleton />}
        />
      </Page>
    );
  }

  if (postQuery.isError) {
    return (
      <Page title={t("postDetail.title")} width="narrow">
        <ErrorState
          title={t("postDetail.errorTitle")}
          description={postQuery.error.message}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void postQuery.refetch()}
            >
              {t("common.retry")}
            </Button>
          }
        />
      </Page>
    );
  }

  const post = postQuery.data;
  if (!post) {
    return <NotFoundPage />;
  }

  const comments = commentsQuery.data ?? [];

  const submitComment = async () => {
    const trimmed = commentBody.trim();
    if (trimmed === "" || commentBody.length > COMMENT_BODY_MAX) return;
    const result = await createComment.mutateAsync({
      postId: post.id,
      body: commentBody,
    });
    if (result.ok) {
      setCommentBody("");
      toast.success(t("postDetail.commentPosted"));
    } else {
      toast.error(result.error.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await deleteComment.mutateAsync({
      commentId,
      postId: post.id,
    });
    if (result.ok) {
      toast.success(t("postDetail.commentDeleted"));
      // The row with focus unmounts; park focus on the section heading so the
      // keyboard position is not lost.
      commentsHeadingRef.current?.focus();
    } else {
      toast.error(result.error.message);
    }
  };

  const canComment =
    commentBody.trim() !== "" &&
    commentBody.length <= COMMENT_BODY_MAX &&
    !createComment.isPending;

  return (
    <Page title={t("postDetail.title")} width="narrow">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeftIcon aria-hidden />
        {t("common.back")}
      </Button>

      <div className="mt-4 grid gap-4">
        <PostCard
          post={post}
          hideCommentLink
          images={imagesQuery.data ?? []}
          imagesLoadError={imagesQuery.isError}
          onRetryImages={() => void imagesQuery.refetch()}
        />

        <section aria-label={t("postDetail.comments")} className="grid gap-3">
          <h2
            ref={commentsHeadingRef}
            tabIndex={-1}
            className="font-heading text-sm font-semibold outline-none"
          >
            {t("postDetail.comments")}
          </h2>

          {user ? (
            <div className="rounded-md border bg-card p-4">
              <Textarea
                aria-label={t("postDetail.writeComment")}
                placeholder={t("postDetail.commentPlaceholder")}
                aria-describedby="comment-count"
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={2}
                disabled={createComment.isPending}
              />
              <div className="mt-3 flex items-center gap-2">
                <span
                  id="comment-count"
                  className="ml-auto text-xs text-muted-foreground tabular-nums"
                >
                  {commentBody.length}/{COMMENT_BODY_MAX}
                </span>
                <Button
                  size="sm"
                  onClick={submitComment}
                  disabled={!canComment}
                >
                  {createComment.isPending ? (
                    <LoaderCircleIcon className="animate-spin" aria-hidden />
                  ) : (
                    <SendIcon aria-hidden />
                  )}
                  {t("postDetail.comment")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              <Link
                to={`/login?returnTo=/post/${post.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("common.signIn")}
              </Link>{" "}
              {t("postDetail.joinConversation")}
            </p>
          )}

          {commentsQuery.isPending && (
            <LoadingArea
              pending
              label={t("postDetail.loadingComments")}
              skeleton={<CommentListSkeleton />}
            />
          )}

          {commentsQuery.isError && (
            <ErrorState
              title={t("postDetail.commentsError")}
              description={commentsQuery.error.message}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void commentsQuery.refetch()}
                >
                  {t("common.retry")}
                </Button>
              }
            />
          )}

          {comments.length === 0 &&
          !commentsQuery.isPending &&
          !commentsQuery.isError ? (
            <p className="text-sm text-muted-foreground">
              {t("postDetail.noComments")}
            </p>
          ) : (
            <ul className="grid gap-2">
              {comments.map((comment) => {
                const pending = isPendingComment(comment);
                return (
                  <li
                    key={comment.id}
                    className={cn(
                      "rounded-md border bg-card p-3 text-sm",
                      pending && "opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        username={comment.author?.username ?? ""}
                        displayName={comment.author?.displayName ?? null}
                        avatarSpecies={comment.author?.avatarSpecies ?? null}
                        size="sm"
                        className="shrink-0"
                      />
                      <Link
                        to={`/u/${comment.author?.username ?? ""}`}
                        className="min-w-0 truncate font-medium hover:underline"
                      >
                        {comment.author?.displayName ??
                          comment.author?.username ??
                          t("postDetail.deletedUser")}
                      </Link>
                      {pending ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <LoaderCircleIcon
                            className="size-3 animate-spin"
                            aria-hidden
                          />
                          {t("postDetail.commentPending")}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      )}
                      {!pending && comment.authorId === user?.id && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="ml-auto"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deleteComment.isPending}
                        >
                          {t("common.delete")}
                        </Button>
                      )}
                      {!pending && comment.authorId !== user?.id && user && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="ml-auto"
                          onClick={() => setReportedCommentId(comment.id)}
                        >
                          {t("postDetail.report")}
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words">
                      {comment.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ReportDialog
        open={reportedCommentId !== null}
        onOpenChange={(open) => {
          if (!open) setReportedCommentId(null);
        }}
        targetType="comment"
        targetId={reportedCommentId ?? ""}
      />
    </Page>
  );
}
