import {
  BanIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { NotFoundPage } from "@/app/route-pages";
import { Page } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import type { CommentRow, ProfileRow, ReportRow } from "@/lib/database.types";
import {
  socialAvailability,
  useHandleReport,
  useIsModerator,
  usePost,
  useRemoveContent,
  useReports,
} from "@/lib/social";
import type { ReportStatus } from "@/lib/social/validation";
import { SuspendDialog } from "@/features/admin/suspend-dialog";

const TAB_STATUSES: Array<{ status: ReportStatus; label: string }> = [
  { status: "open", label: "Open" },
  { status: "actioned", label: "Actioned" },
  { status: "dismissed", label: "Dismissed" },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function reasonBadgeVariant(
  reason: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (reason) {
    case "harassment":
      return "destructive";
    case "spam":
      return "default";
    case "inappropriate":
      return "secondary";
    default:
      return "outline";
  }
}

function useCommentRow(
  commentId: string,
  client: AppSupabaseClient | null,
): { data: CommentRow | null; isPending: boolean } {
  const query = useReactQuery({
    queryKey: ["admin", "comment", commentId],
    enabled: client !== null && commentId !== "",
    retry: false,
    queryFn: async () => {
      if (client === null) {
        return null;
      }
      const { data, error } = await client
        .from("comments")
        .select("*")
        .eq("id", commentId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return (data as CommentRow | null) ?? null;
    },
  });
  return { data: query.data ?? null, isPending: query.isPending };
}

function useProfileRow(
  profileId: string,
  client: AppSupabaseClient | null,
): { data: ProfileRow | null; isPending: boolean } {
  const query = useReactQuery({
    queryKey: ["admin", "profile", profileId],
    enabled: client !== null && profileId !== "",
    retry: false,
    queryFn: async () => {
      if (client === null) {
        return null;
      }
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return (data as ProfileRow | null) ?? null;
    },
  });
  return { data: query.data ?? null, isPending: query.isPending };
}

function ReportContent({
  report,
  client,
}: {
  report: ReportRow;
  client: AppSupabaseClient | null;
}) {
  if (report.target_type === "post") {
    return <PostContent postId={report.target_id} client={client} />;
  }
  if (report.target_type === "comment") {
    return <CommentContent commentId={report.target_id} client={client} />;
  }
  if (report.target_type === "profile") {
    return <ProfileContent profileId={report.target_id} client={client} />;
  }
  return <p className="text-sm text-muted-foreground">Unknown target type.</p>;
}

function PostContent({
  postId,
  client,
}: {
  postId: string;
  client: AppSupabaseClient | null;
}) {
  const postQuery = usePost(postId, client);
  if (postQuery.isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  const post = postQuery.data;
  if (post === null || post === undefined) {
    return (
      <p className="text-sm text-muted-foreground">Content not available.</p>
    );
  }
  return (
    <div className="grid gap-1">
      <p className="text-sm">{post.body}</p>
      <p className="text-xs text-muted-foreground">
        by @{post.author_username}
      </p>
      <Link
        to={`/post/${postId}`}
        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
      >
        <ExternalLinkIcon className="size-3" aria-hidden />
        View post
      </Link>
    </div>
  );
}

function CommentContent({
  commentId,
  client,
}: {
  commentId: string;
  client: AppSupabaseClient | null;
}) {
  const { data: comment, isPending } = useCommentRow(commentId, client);
  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (comment === null || comment.removed_at !== null) {
    return (
      <p className="text-sm text-muted-foreground">Content already removed.</p>
    );
  }
  return (
    <div className="grid gap-1">
      <p className="text-sm">{comment.body}</p>
      <p className="text-xs text-muted-foreground">
        Comment by {comment.author_id.slice(0, 8)}
      </p>
      <Link
        to={`/post/${comment.post_id}`}
        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
      >
        <ExternalLinkIcon className="size-3" aria-hidden />
        View comment
      </Link>
    </div>
  );
}

function ProfileContent({
  profileId,
  client,
}: {
  profileId: string;
  client: AppSupabaseClient | null;
}) {
  const { data: profile, isPending } = useProfileRow(profileId, client);
  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (profile === null) {
    return (
      <p className="text-sm text-muted-foreground">Content not available.</p>
    );
  }
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <UserAvatar
          username={profile.username}
          displayName={profile.display_name}
          avatarSpecies={profile.avatar_species}
          size="sm"
        />
        <Link
          to={`/u/${profile.username}`}
          className="text-sm font-medium hover:underline"
        >
          @{profile.username}
        </Link>
      </div>
      <Link
        to={`/u/${profile.username}`}
        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
      >
        <ExternalLinkIcon className="size-3" aria-hidden />
        View profile
      </Link>
    </div>
  );
}

function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={busy}
          >
            {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveContentDialog({
  targetType,
  onRemove,
}: {
  targetType: "post" | "comment";
  onRemove: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    const trimmed = reason.trim();
    if (trimmed === "") {
      toast.error("Enter a reason for the removal.");
      return;
    }
    setBusy(true);
    await onRemove(trimmed);
    setBusy(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2Icon />
          Remove content
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this {targetType}?</DialogTitle>
          <DialogDescription>
            The content is removed for everyone, the author is notified with
            your reason, and the report is marked as actioned.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Textarea
            aria-label="Reason for the removal"
            placeholder="Reason for the removal"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void remove();
            }}
            disabled={busy || reason.trim() === ""}
          >
            {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
            Remove content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportCard({
  report,
  client,
}: {
  report: ReportRow;
  client: AppSupabaseClient | null;
}) {
  const handleReport = useHandleReport(client);
  const removeContent = useRemoveContent(client);
  const [suspendOpen, setSuspendOpen] = useState(false);

  // The author of the reported content: the profile itself for profile
  // reports, otherwise the author of the reported post or comment.
  const postQuery = usePost(
    report.target_type === "post" ? report.target_id : "",
    client,
  );
  const commentQuery = useCommentRow(
    report.target_type === "comment" ? report.target_id : "",
    client,
  );
  const suspendUserId =
    report.target_type === "profile"
      ? report.target_id
      : report.target_type === "post"
        ? (postQuery.data?.author_id ?? null)
        : (commentQuery.data?.author_id ?? null);

  const dismiss = async () => {
    const result = await handleReport.mutateAsync({
      reportId: report.id,
      status: "dismissed",
    });
    if (result.ok) {
      toast.success("Report dismissed.");
    } else {
      toast.error(result.error.message);
    }
  };

  const remove = async (reason: string) => {
    if (report.target_type !== "post" && report.target_type !== "comment") {
      return;
    }
    const removed = await removeContent.mutateAsync({
      type: report.target_type,
      id: report.target_id,
      reason,
      reportId: report.id,
    });
    if (!removed.ok) {
      toast.error(removed.error.message);
      return;
    }
    const result = await handleReport.mutateAsync({
      reportId: report.id,
      status: "actioned",
    });
    if (result.ok) {
      toast.success("Content removed and report actioned.");
    } else {
      toast.error(result.error.message);
    }
  };

  const markActioned = async () => {
    const result = await handleReport.mutateAsync({
      reportId: report.id,
      status: "actioned",
    });
    if (result.ok) {
      toast.success("User suspended and report actioned.");
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={reasonBadgeVariant(report.reason)}>
            {report.reason}
          </Badge>
          <CardTitle className="text-base">
            {report.target_type} report
          </CardTitle>
        </div>
        <CardDescription>
          Reported {formatDate(report.created_at)} · Target:{" "}
          {report.target_type} · {report.target_id}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {report.details ? (
          <p className="text-sm text-muted-foreground">
            Reporter details: {report.details}
          </p>
        ) : null}
        <div className="rounded-md border p-3">
          <ReportContent report={report} client={client} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm">
                <EyeOffIcon />
                Dismiss
              </Button>
            }
            title="Dismiss this report?"
            description="The report stays in the history as dismissed and no action is taken."
            confirmLabel="Dismiss report"
            onConfirm={dismiss}
          />
          {report.target_type === "post" || report.target_type === "comment" ? (
            <RemoveContentDialog
              targetType={report.target_type}
              onRemove={remove}
            />
          ) : null}
          {suspendUserId ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuspendOpen(true)}
              >
                <BanIcon />
                Suspend user
              </Button>
              <SuspendDialog
                userId={suspendUserId}
                client={client}
                open={suspendOpen}
                onOpenChange={setSuspendOpen}
                onSuspended={() => {
                  void markActioned();
                }}
              />
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminReportsPage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  if (socialAvailability(client) !== "ready") {
    return (
      <Page title="Reports" width="narrow">
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>Moderation is unavailable</AlertTitle>
          <AlertDescription>
            Moderation tools need the community features to be configured.
          </AlertDescription>
        </Alert>
      </Page>
    );
  }

  return <ModeratorGate client={client} />;
}

function ModeratorGate({ client }: { client: AppSupabaseClient | null }) {
  const moderatorQuery = useIsModerator(client);

  if (moderatorQuery.isPending) {
    return (
      <Page title="Reports" width="wide">
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Page>
    );
  }

  if (!moderatorQuery.data) {
    return <NotFoundPage />;
  }

  return <ReportsList client={client} />;
}

function ReportsList({ client }: { client: AppSupabaseClient | null }) {
  const [status, setStatus] = useState<ReportStatus>("open");
  const reportsQuery = useReports(status, client);

  return (
    <Page
      title="Reports"
      description="Review reports from the community."
      width="wide"
    >
      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as ReportStatus)}
      >
        <TabsList aria-label="Report status">
          {TAB_STATUSES.map((tab) => (
            <TabsTrigger key={tab.status} value={tab.status}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {reportsQuery.isPending ? (
        <div className="mt-4 grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : reportsQuery.isError ? (
        <div className="mt-4 grid gap-4">
          <Alert variant="destructive">
            <ShieldAlertIcon />
            <AlertTitle>Reports could not be loaded</AlertTitle>
            <AlertDescription>Try again in a moment.</AlertDescription>
          </Alert>
          <Button
            className="justify-self-start"
            variant="outline"
            onClick={() => {
              void reportsQuery.refetch();
            }}
          >
            <RefreshCwIcon />
            Try again
          </Button>
        </div>
      ) : (reportsQuery.data ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No {status} reports.
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {(reportsQuery.data ?? []).map((report) => (
            <ReportCard key={report.id} report={report} client={client} />
          ))}
        </div>
      )}
    </Page>
  );
}
