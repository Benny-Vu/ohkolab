import {
  BanIcon,
  EyeOffIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from "lucide-react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { NotFoundPage } from "@/features/system/not-found-page";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Page } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/format-date";
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
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { SuspendDialog } from "@/features/admin/suspend-dialog";
import { MessageReportContent } from "@/features/admin/message-report-content";
import { useMessageReportSnapshot } from "@/lib/messages/queries";
import { reportedSnapshotEntry } from "@/lib/messages/logic";

const TAB_STATUSES: Array<{ status: ReportStatus; labelKey: TranslationKey }> =
  [
    { status: "open", labelKey: "admin.statusOpen" },
    { status: "actioned", labelKey: "admin.statusActioned" },
    { status: "dismissed", labelKey: "admin.statusDismissed" },
  ];

const TARGET_LABELS: Record<string, TranslationKey> = {
  post: "report.targetPost",
  comment: "report.targetComment",
  profile: "report.targetProfile",
  message: "messages.targetLabel",
};

function reasonBadgeVariant(
  reason: string,
): "default" | "secondary" | "outline" {
  switch (reason) {
    case "harassment":
      return "default";
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
  const t = useT();
  if (report.target_type === "post") {
    return <PostContent postId={report.target_id} client={client} />;
  }
  if (report.target_type === "comment") {
    return <CommentContent commentId={report.target_id} client={client} />;
  }
  if (report.target_type === "profile") {
    return <ProfileContent profileId={report.target_id} client={client} />;
  }
  if (report.target_type === "message") {
    return <MessageReportContent report={report} client={client} />;
  }
  return (
    <p className="text-sm text-muted-foreground">{t("admin.unknownTarget")}</p>
  );
}

function PostContent({
  postId,
  client,
}: {
  postId: string;
  client: AppSupabaseClient | null;
}) {
  const t = useT();
  const postQuery = usePost(postId, client);
  if (postQuery.isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  const post = postQuery.data;
  if (post === null || post === undefined) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("admin.contentUnavailable")}
      </p>
    );
  }
  return (
    <div className="grid gap-1">
      <p className="break-words text-sm">{post.body}</p>
      <p className="text-xs text-muted-foreground">
        by @{post.author_username}
      </p>
      <Link
        to={`/post/${postId}`}
        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
      >
        <ExternalLinkIcon className="size-3" aria-hidden />
        {t("admin.viewPost")}
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
  const t = useT();
  const { data: comment, isPending } = useCommentRow(commentId, client);
  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (comment === null || comment.removed_at !== null) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("admin.contentRemoved")}
      </p>
    );
  }
  return (
    <div className="grid gap-1">
      <p className="break-words text-sm">{comment.body}</p>
      <p className="text-xs text-muted-foreground">
        {t("admin.commentBy", { id: comment.author_id.slice(0, 8) })}
      </p>
      <Link
        to={`/post/${comment.post_id}`}
        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
      >
        <ExternalLinkIcon className="size-3" aria-hidden />
        {t("admin.viewComment")}
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
  const t = useT();
  const { data: profile, isPending } = useProfileRow(profileId, client);
  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (profile === null) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("admin.contentUnavailable")}
      </p>
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
        {t("admin.viewProfile")}
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
  const t = useT();
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
            {t("common.cancel")}
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
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    const trimmed = reason.trim();
    if (trimmed === "") {
      toast.error(t("postCard.enterReason"));
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
          {t("admin.removeContent")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("admin.removeThis", {
              target: t(
                targetType === "post"
                  ? "report.targetPost"
                  : "report.targetComment",
              ),
            })}
          </DialogTitle>
          <DialogDescription>{t("admin.removeDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Textarea
            aria-label={t("admin.removalReasonAria")}
            placeholder={t("admin.removalReasonAria")}
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
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void remove();
            }}
            disabled={busy || reason.trim() === ""}
          >
            {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
            {t("admin.removeContent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportRowView({
  report,
  client,
}: {
  report: ReportRow;
  client: AppSupabaseClient | null;
}) {
  const t = useT();
  const handleReport = useHandleReport(client);
  const removeContent = useRemoveContent(client);
  const [suspendOpen, setSuspendOpen] = useState(false);

  // The author of the reported content: the profile itself for profile
  // reports, the post or comment author, or — for message reports — the
  // sender of the reported message, read from the report's snapshot (never
  // from the messages table).
  const postQuery = usePost(
    report.target_type === "post" ? report.target_id : "",
    client,
  );
  const commentQuery = useCommentRow(
    report.target_type === "comment" ? report.target_id : "",
    client,
  );
  const messageSnapshot = useMessageReportSnapshot(
    report.target_type === "message" ? report.id : "",
    client,
  );
  const suspendUserId =
    report.target_type === "profile"
      ? report.target_id
      : report.target_type === "post"
        ? (postQuery.data?.author_id ?? null)
        : report.target_type === "message"
          ? (reportedSnapshotEntry(messageSnapshot.data ?? [])?.sender_id ??
            null)
          : (commentQuery.data?.author_id ?? null);

  const dismiss = async () => {
    const result = await handleReport.mutateAsync({
      reportId: report.id,
      status: "dismissed",
    });
    if (result.ok) {
      toast.success(t("admin.reportDismissedToast"));
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
      toast.success(t("admin.removedActionedToast"));
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
      toast.success(t("admin.suspendedActionedToast"));
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <Badge variant={reasonBadgeVariant(report.reason)}>
            {report.reason}
          </Badge>
        </TableCell>
        <TableCell className="text-sm">
          {t(TARGET_LABELS[report.target_type] ?? "report.targetProfile")}
        </TableCell>
        <TableCell className="text-sm tabular-nums text-muted-foreground">
          {formatDate(report.created_at)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex flex-wrap justify-end gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <EyeOffIcon />
                  {t("admin.dismiss")}
                </Button>
              }
              title={t("admin.dismissTitle")}
              description={t("admin.dismissDescription")}
              confirmLabel={t("admin.dismissReport")}
              onConfirm={dismiss}
            />
            {report.target_type === "post" ||
            report.target_type === "comment" ? (
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
                  {t("publicProfile.suspendUser")}
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
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} className="whitespace-normal">
          <div className="grid gap-2">
            {report.details ? (
              <p className="break-words text-sm text-muted-foreground">
                {t("admin.reporterDetails", { details: report.details })}
              </p>
            ) : null}
            <div className="rounded-md border p-3">
              <ReportContent report={report} client={client} />
            </div>
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}

export function AdminReportsPage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  if (socialAvailability(client) !== "ready") {
    return (
      <Page title={t("pageTitle.reports")} width="narrow">
        <EmptyState
          title={t("admin.moderationUnavailable")}
          description={t("admin.moderationUnavailableDescription")}
        />
      </Page>
    );
  }

  return <ModeratorGate client={client} />;
}

function ModeratorGate({ client }: { client: AppSupabaseClient | null }) {
  const t = useT();
  const moderatorQuery = useIsModerator(client);

  if (moderatorQuery.isPending) {
    return (
      <Page title={t("pageTitle.reports")} width="wide">
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
  const t = useT();
  const [status, setStatus] = useState<ReportStatus>("open");
  const reportsQuery = useReports(status, client);

  return (
    <Page
      title={t("pageTitle.reports")}
      description={t("admin.reportsDescription")}
      width="wide"
    >
      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as ReportStatus)}
      >
        <TabsList aria-label={t("admin.reportStatusAria")}>
          {TAB_STATUSES.map((tab) => (
            <TabsTrigger key={tab.status} value={tab.status}>
              {t(tab.labelKey)}
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
        <div className="mt-4">
          <ErrorState
            title={t("admin.reportsLoadError")}
            description={t("admin.loadErrorDescription")}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void reportsQuery.refetch();
                }}
              >
                {t("common.retry")}
              </Button>
            }
          />
        </div>
      ) : (reportsQuery.data ?? []).length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={t("admin.noStatusReports", {
              // The English message lowercases the tab label ("No open
              // reports."); Japanese has no case, so this is a no-op there.
              status: t(
                TAB_STATUSES.find((tab) => tab.status === status)?.labelKey ??
                  "admin.statusOpen",
              ).toLowerCase(),
            })}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <Table density="dense">
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.colReason")}</TableHead>
                <TableHead>{t("admin.colTarget")}</TableHead>
                <TableHead>{t("admin.colReported")}</TableHead>
                <TableHead className="text-right">
                  {t("admin.colActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reportsQuery.data ?? []).map((report) => (
                <ReportRowView
                  key={report.id}
                  report={report}
                  client={client}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  );
}
