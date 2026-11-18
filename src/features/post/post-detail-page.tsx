import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, LoaderCircleIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Page } from "@/components/page";
import { NotFoundPage } from "@/features/system/not-found-page";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth/use-auth";
import { useCreateComment, useDeleteComment } from "@/lib/social/mutations";
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

  if (postQuery.isPending) {
    return (
      <Page title="Post" width="narrow">
        <div className="grid gap-3" aria-label="Loading post">
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>
      </Page>
    );
  }

  if (postQuery.isError) {
    return (
      <Page title="Post" width="narrow">
        <ErrorState
          title="Could not load post"
          description={postQuery.error.message}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void postQuery.refetch()}
            >
              Try again
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
      toast.success("Comment posted");
    } else {
      toast.error(result.error.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await deleteComment.mutateAsync({
      commentId,
      postId: post.id,
    });
    if (result.ok) toast.success("Comment deleted");
    else toast.error(result.error.message);
  };

  const canComment =
    commentBody.trim() !== "" &&
    commentBody.length <= COMMENT_BODY_MAX &&
    !createComment.isPending;

  return (
    <Page title="Post" width="narrow">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeftIcon aria-hidden />
        Back
      </Button>

      <div className="mt-4 grid gap-4">
        <PostCard post={post} hideCommentLink images={imagesQuery.data ?? []} />

        <section aria-label="Comments" className="grid gap-3">
          <h2 className="text-sm font-semibold">Comments</h2>

          {user ? (
            <div className="rounded-md border bg-card p-4">
              <Textarea
                aria-label="Write a comment"
                placeholder="Add a comment…"
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={2}
                disabled={createComment.isPending}
              />
              <div className="mt-3 flex items-center gap-2">
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
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
                  Comment
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              <Link
                to={`/login?returnTo=/post/${post.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          )}

          {commentsQuery.isPending && (
            <p className="text-sm text-muted-foreground">Loading comments…</p>
          )}

          {comments.length === 0 && !commentsQuery.isPending ? (
            <p className="text-sm text-muted-foreground">No comments yet</p>
          ) : (
            <ul className="grid gap-2">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-md border bg-card p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      username={comment.author?.username ?? ""}
                      displayName={comment.author?.displayName ?? null}
                      avatarSpecies={comment.author?.avatarSpecies ?? null}
                      size="sm"
                    />
                    <Link
                      to={`/u/${comment.author?.username ?? ""}`}
                      className="font-medium hover:underline"
                    >
                      {comment.author?.displayName ??
                        comment.author?.username ??
                        "Deleted user"}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                    {comment.authorId === user?.id && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={deleteComment.isPending}
                      >
                        Delete
                      </Button>
                    )}
                    {comment.authorId !== user?.id && user && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => setReportedCommentId(comment.id)}
                      >
                        Report
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {comment.body}
                  </p>
                </li>
              ))}
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
