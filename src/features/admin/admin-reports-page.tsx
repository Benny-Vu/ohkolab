import {
  BanIcon,
  CalendarClockIcon,
  EyeOffIcon,
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
import { PokemonIcon } from "@/components/pokemon-sprite";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import type { CommentRow, ProfileRow, ReportRow } from "@/lib/database.types";
import {
  socialAvailability,
  useHandleReport,
  useIsModerator,
  usePost,
  useRemoveContent,
  useReports,
  useSuspendUser,
} from "@/lib/social";

const SUSPEND_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
] as const;

function suspendUntil(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

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
  client: typeof supabase,
): { data: CommentRow | null; isPending: boolean } {
  return useQueryCommentRow(commentId, client);
}

function useQueryCommentRow(
  commentId: string,
  client: typeof supabase,
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
  client: typeof supabase,
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
  client: typeof supabase;
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
  client: typeof supabase;
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
    </div>
  );
}

function CommentContent({
  commentId,
  client,
}: {
  commentId: string;
  client: typeof supabase;
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
    </div>
  );
}

function ProfileContent({
  profileId,
  client,
}: {
  profileId: string;
  client: typeof supabase;
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
    <div className="flex items-center gap-2">
      {profile.avatar_species ? (
        <PokemonIcon species={profile.avatar_species} />
      ) : null}
      <Link
        to={`/u/${profile.username}`}
        className="text-sm font-medium hover:underline"
      >
        @{profile.username}
      </Link>
    </div>
  );
}

function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
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
            variant={confirmVariant}
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

function SuspendDialog({
  userId,
  onSuspended,
}: {
  userId: string;
  onSuspended: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const suspendUser = useSuspendUser();

  const suspend = async (days: number) => {
    const trimmed = reason.trim();
    if (trimmed === "") {
      toast.error("Enter a reason for the suspension.");
      return;
    }
    setBusy(true);
    const until = suspendUntil(days);
    const result = await suspendUser.mutateAsync({
      userId,
      until,
      reason: trimmed,
    });
    setBusy(false);
    if (result.ok) {
      toast.success("User suspended.");
      setOpen(false);
      onSuspended();
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BanIcon />
          Suspend user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend user</DialogTitle>
          <DialogDescription>
            Temporarily prevent this user from posting, commenting and
            interacting. Choose a duration and give a reason.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Textarea
            placeholder="Reason for the suspension"
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
          {SUSPEND_PRESETS.map((preset) => (
            <Button
              key={preset.days}
              variant="destructive"
              onClick={() => {
                void suspend(preset.days);
              }}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CalendarClockIcon />
              )}
              {preset.label}
            </Button>
          ))}
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
  client: typeof supabase;
}) {
  const handleReport = useHandleReport();
  const removeContent = useRemoveContent();

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

  const remove = async () => {
    if (report.target_type !== "post" && report.target_type !== "comment") {
      return;
    }
    const removed = await removeContent.mutateAsync({
      type: report.target_type,
      id: report.target_id,
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

  const suspendUserId =
    report.target_type === "profile" ? report.target_id : null;

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
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="sm">
                  <Trash2Icon />
                  Remove content
                </Button>
              }
              title="Remove this content?"
              description="The content is removed for everyone and the report is marked as actioned."
              confirmLabel="Remove content"
              confirmVariant="destructive"
              onConfirm={remove}
            />
          ) : null}
          {suspendUserId ? (
            <SuspendDialog userId={suspendUserId} onSuspended={() => {}} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminReportsPage({
  client = supabase,
}: {
  client?: typeof supabase;
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

function ModeratorGate({ client }: { client: typeof supabase }) {
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

function ReportsList({ client }: { client: typeof supabase }) {
  const reportsQuery = useReports("open", client);

  return (
    <Page
      title="Reports"
      description="Review open reports from the community."
      width="wide"
    >
      {reportsQuery.isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : reportsQuery.isError ? (
        <div className="grid gap-4">
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
        <p className="text-sm text-muted-foreground">No open reports.</p>
      ) : (
        <div className="grid gap-4">
          {(reportsQuery.data ?? []).map((report) => (
            <ReportCard key={report.id} report={report} client={client} />
          ))}
        </div>
      )}
    </Page>
  );
}
