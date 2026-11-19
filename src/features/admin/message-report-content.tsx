import { useQuery as useReactQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format-date";
import type { ProfileRow, ReportRow } from "@/lib/database.types";
import type { AppSupabaseClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n/t";
import { useMessageReportSnapshot } from "@/lib/messages/queries";
import {
  reportedSnapshotEntry,
  type MessageSnapshotEntry,
} from "@/lib/messages/logic";

/**
 * Moderators only: the snapshot behind a message report — the reported
 * message plus the 20 before it, oldest first, sender ids resolved to
 * usernames where readable. Moderators never read the messages table; this
 * snapshot (copied by `report_message()`) is the only content they see.
 */

/** Looks up the profiles of every sender in the snapshot, in one query. */
function useSnapshotProfiles(
  entries: MessageSnapshotEntry[],
  client: AppSupabaseClient | null,
): { byId: Map<string, ProfileRow>; isPending: boolean } {
  const ids = [...new Set(entries.map((entry) => entry.sender_id))];
  const query = useReactQuery({
    queryKey: ["admin", "message-report-profiles", ids],
    enabled: client !== null && ids.length > 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await client!
        .from("profiles")
        .select(
          "id, username, display_name, avatar_species, bio, created_at, updated_at",
        )
        .in("id", ids);
      if (error) {
        throw error;
      }
      return (data ?? []) as ProfileRow[];
    },
  });
  return {
    byId: new Map((query.data ?? []).map((row) => [row.id, row])),
    isPending: query.isPending,
  };
}

export function MessageReportContent({
  report,
  client,
}: {
  report: ReportRow;
  client: AppSupabaseClient | null;
}) {
  const t = useT();
  const snapshotQuery = useMessageReportSnapshot(report.id, client);
  const entries = snapshotQuery.data ?? [];
  const profiles = useSnapshotProfiles(entries, client);

  if (snapshotQuery.isPending) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("admin.contentUnavailable")}
      </p>
    );
  }

  const reported = reportedSnapshotEntry(entries);

  return (
    <div className="grid gap-2">
      <ol className="grid gap-2">
        {entries.map((entry, index) => {
          const profile = profiles.byId.get(entry.sender_id);
          const name = profile
            ? `@${profile.username}`
            : entry.sender_id.slice(0, 8);
          const isReported = reported !== null && index === entries.length - 1;
          return (
            <li
              key={entry.id}
              className="grid gap-0.5 rounded-md border p-2 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {t("messages.messageBy", { name })}
                <span className="tabular-nums">
                  {formatDate(entry.created_at)}
                </span>
                {isReported ? (
                  <Badge variant="destructive">
                    {t("messages.reportedBadge")}
                  </Badge>
                ) : null}
              </span>
              <span className="break-words whitespace-pre-wrap">
                {entry.body}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
