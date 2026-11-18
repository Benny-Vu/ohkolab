import {
  CheckIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import { NotFoundPage } from "@/features/system/not-found-page";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Page } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/format-date";
import type { AppealWithAction } from "@/lib/social/moderation";
import {
  socialAvailability,
  useAppeals,
  useHandleAppeal,
  useIsModerator,
  useModerationTargetText,
} from "@/lib/social";

function actionLabel(action: AppealWithAction["action"]): string {
  if (action === null) {
    return "Moderation action";
  }
  if (action.action === "suspend") {
    return "Suspension";
  }
  if (action.target_type === "post") {
    return "Removed post";
  }
  if (action.target_type === "comment") {
    return "Removed comment";
  }
  return "Removed content";
}

function AppellantCell({
  appellant,
}: {
  appellant: AppealWithAction["appellant"];
}) {
  if (appellant === null) {
    return (
      <p className="text-sm text-muted-foreground">
        The appellant's profile is no longer available.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <UserAvatar
        username={appellant.username}
        displayName={appellant.display_name}
        avatarSpecies={appellant.avatar_species}
        size="sm"
      />
      <div className="min-w-0">
        <Link
          to={`/u/${appellant.username}`}
          className="block truncate text-sm font-medium hover:underline"
        >
          {appellant.display_name ?? appellant.username}
        </Link>
        <Link
          to={`/u/${appellant.username}`}
          className="block truncate text-xs text-muted-foreground hover:underline"
        >
          @{appellant.username}
        </Link>
      </div>
    </div>
  );
}

function AppealRowView({
  entry,
  client,
}: {
  entry: AppealWithAction;
  client: AppSupabaseClient | null;
}) {
  const handleAppeal = useHandleAppeal(client);
  const targetTextQuery = useModerationTargetText(entry.action, client);
  const action = entry.action;

  const decide = async (decision: "upheld" | "reversed") => {
    const result = await handleAppeal.mutateAsync({
      appealId: entry.appeal.id,
      decision,
    });
    if (result.ok) {
      toast.success(
        decision === "upheld"
          ? "Appeal upheld. The action stands."
          : "Appeal reversed. The action is undone.",
      );
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="whitespace-normal">
          <AppellantCell appellant={entry.appellant} />
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{actionLabel(action)}</Badge>
        </TableCell>
        <TableCell className="text-sm tabular-nums text-muted-foreground">
          {formatDate(entry.appeal.created_at)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={handleAppeal.isPending}
              onClick={() => {
                void decide("upheld");
              }}
            >
              {handleAppeal.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CheckIcon />
              )}
              Uphold
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={handleAppeal.isPending}
              onClick={() => {
                void decide("reversed");
              }}
            >
              <RotateCcwIcon />
              Reverse
            </Button>
          </div>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} className="whitespace-normal">
          <div className="grid gap-2">
            {action ? (
              <div className="grid gap-2 rounded-md border p-3">
                <p className="text-sm">
                  <span className="font-medium">Reason: </span>
                  {action.reason}
                </p>
                {targetTextQuery.data ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Original content:{" "}
                    </span>
                    {targetTextQuery.data}
                  </p>
                ) : null}
                {action.target_type === "post" ? (
                  <Link
                    to={`/post/${action.target_id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                  >
                    <ExternalLinkIcon className="size-3" aria-hidden />
                    View post
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                The original moderation action is no longer available.
              </p>
            )}
            <div className="grid gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">Appeal message</p>
              <p className="text-sm text-muted-foreground">
                {entry.appeal.message}
              </p>
            </div>
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}

export function AdminAppealsPage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  if (socialAvailability(client) !== "ready") {
    return (
      <Page title="Appeals" width="narrow">
        <EmptyState
          title="Moderation is unavailable"
          description="Moderation tools need the community features to be configured."
        />
      </Page>
    );
  }

  return <AppealsModeratorGate client={client} />;
}

function AppealsModeratorGate({
  client,
}: {
  client: AppSupabaseClient | null;
}) {
  const moderatorQuery = useIsModerator(client);

  if (moderatorQuery.isPending) {
    return (
      <Page title="Appeals" width="wide">
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

  return <AppealsList client={client} />;
}

function AppealsList({ client }: { client: AppSupabaseClient | null }) {
  const appealsQuery = useAppeals(client);

  return (
    <Page
      title="Appeals"
      description="Review appeals against moderation actions."
      width="wide"
    >
      {appealsQuery.isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : appealsQuery.isError ? (
        <div className="mt-4">
          <ErrorState
            title="Appeals could not be loaded"
            description="Try again in a moment."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void appealsQuery.refetch();
                }}
              >
                Try again
              </Button>
            }
          />
        </div>
      ) : (appealsQuery.data ?? []).length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No open appeals." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <Table density="dense">
            <TableHeader>
              <TableRow>
                <TableHead>Appellant</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(appealsQuery.data ?? []).map((entry) => (
                <AppealRowView
                  key={entry.appeal.id}
                  entry={entry}
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
