import {
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import type { FeedbackRow, ProfileRow } from "@/lib/database.types";
import { socialAvailability, useIsModerator } from "@/lib/social";
import {
  useFeedback,
  useSetFeedbackStatus,
  type FeedbackStatus,
} from "@/features/feedback/feedback";

/**
 * The moderator feedback queue at /admin/feedback: New, Seen and Done tabs,
 * mark seen and mark done through set_feedback_status, sender details,
 * context and a Sentry link when a crash id is present.
 */

const TAB_STATUSES: Array<{ status: FeedbackStatus; label: string }> = [
  { status: "new", label: "New" },
  { status: "seen", label: "Seen" },
  { status: "done", label: "Done" },
];

/** The Sentry organisation slug for the crash-report links. */
const SENTRY_ORG = "vu-forge";

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

function sentryLink(crashId: string): string {
  return `https://sentry.io/organizations/${SENTRY_ORG}/issues/?query=${encodeURIComponent(crashId)}`;
}

function readContext(context: FeedbackRow["context"]): Record<string, unknown> {
  if (context === null || context === undefined) {
    return {};
  }
  if (typeof context !== "object" || Array.isArray(context)) {
    return {};
  }
  return context as Record<string, unknown>;
}

function useProfileRow(
  profileId: string,
  client: AppSupabaseClient | null,
): { data: ProfileRow | null; isPending: boolean } {
  const query = useReactQuery({
    queryKey: ["admin", "feedback", "profile", profileId],
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

function SenderDetails({
  userId,
  client,
}: {
  userId: string;
  client: AppSupabaseClient | null;
}) {
  const { data: profile, isPending } = useProfileRow(userId, client);
  if (isPending) {
    return <Skeleton className="h-8 w-40" />;
  }
  if (profile === null) {
    return <p className="text-xs text-muted-foreground">Deleted account</p>;
  }
  return (
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
  );
}

function ContextList({ context }: { context: FeedbackRow["context"] }) {
  const entries = Object.entries(readContext(context));
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Technical details
      </p>
      <dl className="grid gap-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex flex-wrap gap-2 text-xs">
            <dt className="text-muted-foreground">{key}:</dt>
            <dd className="break-all">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SentryLink({ crashId }: { crashId: string }) {
  return (
    <a
      href={sentryLink(crashId)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
    >
      <ExternalLinkIcon className="size-3" aria-hidden />
      View crash in Sentry
    </a>
  );
}

function FeedbackCard({
  feedback,
  client,
}: {
  feedback: FeedbackRow;
  client: AppSupabaseClient | null;
}) {
  const setStatus = useSetFeedbackStatus(client);
  const context = readContext(feedback.context);
  const crashId =
    typeof context.crash_id === "string" ? context.crash_id : null;

  async function mark(status: "seen" | "done"): Promise<void> {
    const result = await setStatus.mutateAsync({
      feedbackId: feedback.id,
      status,
    });
    if (result.ok) {
      toast.success(
        status === "done" ? "Feedback marked done." : "Feedback marked seen.",
      );
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              feedback.kind === "bug"
                ? "destructive"
                : feedback.kind === "idea"
                  ? "default"
                  : "secondary"
            }
          >
            {feedback.kind}
          </Badge>
          <CardTitle className="text-base">Feedback</CardTitle>
        </div>
        <CardDescription>
          Sent {formatDate(feedback.created_at)} · Status: {feedback.status}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <SenderDetails userId={feedback.user_id} client={client} />
        <p className="text-sm whitespace-pre-wrap">{feedback.message}</p>
        <ContextList context={feedback.context} />
        {crashId ? <SentryLink crashId={crashId} /> : null}
        {feedback.status !== "done" ? (
          <div className="flex flex-wrap gap-2">
            {feedback.status === "new" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={setStatus.isPending}
                onClick={() => {
                  void mark("seen");
                }}
              >
                <EyeIcon />
                Mark seen
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={setStatus.isPending}
              onClick={() => {
                void mark("done");
              }}
            >
              <CheckIcon />
              Mark done
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminFeedbackPage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  if (socialAvailability(client) !== "ready") {
    return (
      <Page title="Feedback" width="narrow">
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
      <Page title="Feedback" width="wide">
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

  return <FeedbackList client={client} />;
}

function FeedbackList({ client }: { client: AppSupabaseClient | null }) {
  const [status, setStatus] = useState<FeedbackStatus>("new");
  const feedbackQuery = useFeedback(status, client);

  return (
    <Page
      title="Feedback"
      description="Review feedback from the community."
      width="wide"
    >
      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as FeedbackStatus)}
      >
        <TabsList aria-label="Feedback status">
          {TAB_STATUSES.map((tab) => (
            <TabsTrigger key={tab.status} value={tab.status}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {feedbackQuery.isPending ? (
        <div className="mt-4 grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : feedbackQuery.isError ? (
        <div className="mt-4 grid gap-4">
          <Alert variant="destructive">
            <ShieldAlertIcon />
            <AlertTitle>Feedback could not be loaded</AlertTitle>
            <AlertDescription>Try again in a moment.</AlertDescription>
          </Alert>
          <Button
            className="justify-self-start"
            variant="outline"
            onClick={() => {
              void feedbackQuery.refetch();
            }}
          >
            <RefreshCwIcon />
            Try again
          </Button>
        </div>
      ) : (feedbackQuery.data ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No {status} feedback.
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {(feedbackQuery.data ?? []).map((feedback) => (
            <FeedbackCard
              key={feedback.id}
              feedback={feedback}
              client={client}
            />
          ))}
        </div>
      )}
    </Page>
  );
}
