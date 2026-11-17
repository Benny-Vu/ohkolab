import {
  CheckIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { NotFoundPage } from "@/app/route-pages";
import { Page } from "@/components/page";
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
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import type { AppealWithAction } from "@/lib/social/moderation";
import {
  socialAvailability,
  useAppeals,
  useHandleAppeal,
  useIsModerator,
  useModerationTargetText,
} from "@/lib/social";

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

function AppealCard({
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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{actionLabel(action)}</Badge>
          <CardTitle className="text-base">Appeal</CardTitle>
        </div>
        <CardDescription>
          Filed {formatDate(entry.appeal.created_at)}
          {action ? ` · Action taken ${formatDate(action.created_at)}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
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
        <div className="flex flex-wrap gap-2">
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
      </CardContent>
    </Card>
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
        <div className="grid gap-4">
          <Alert variant="destructive">
            <ShieldAlertIcon />
            <AlertTitle>Appeals could not be loaded</AlertTitle>
            <AlertDescription>Try again in a moment.</AlertDescription>
          </Alert>
          <Button
            className="justify-self-start"
            variant="outline"
            onClick={() => {
              void appealsQuery.refetch();
            }}
          >
            <RefreshCwIcon />
            Try again
          </Button>
        </div>
      ) : (appealsQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No open appeals.</p>
      ) : (
        <div className="grid gap-4">
          {(appealsQuery.data ?? []).map((entry) => (
            <AppealCard key={entry.appeal.id} entry={entry} client={client} />
          ))}
        </div>
      )}
    </Page>
  );
}
