/**
 * The social steps of the welcome flow: following a few suggested people
 * and joining a group. This module is loaded lazily by welcome-flow.tsx so
 * the social and groups modules stay out of the entry chunk; step 1 (the
 * profile bits) lives in the shell, which needs nothing beyond the auth
 * layer it already carries.
 */

import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LoadingArea, TextLinesSkeleton } from "@/components/skeletons";
import { UserAvatar } from "@/components/user-avatar";
import { useT } from "@/lib/i18n/t";
import { useJoinGroup } from "@/lib/groups/mutations";
import { useDiscoverGroups } from "@/lib/groups/queries";
import { useToggleFollow } from "@/lib/social/mutations";
import {
  FOLLOW_SUGGESTIONS_QUERY_KEY,
  useFollowSuggestions,
  type FollowSuggestion,
} from "@/lib/social/suggestions";

/** How many rows each social step lists. */
export const WELCOME_ROW_LIMIT = 5;

/** Renders one of the two social steps. */
export function WelcomeFlowSteps({ step }: { step: 1 | 2 }) {
  return step === 1 ? <PeopleStep /> : <GroupsStep />;
}

function PeopleStep() {
  const t = useT();
  const suggestions = useFollowSuggestions();
  const rows = (suggestions.data ?? []).slice(0, WELCOME_ROW_LIMIT);
  const [hidden, setHidden] = useState<string[]>([]);

  return (
    <LoadingArea
      pending={suggestions.isPending}
      label={t("followSuggest.loading")}
      skeleton={<TextLinesSkeleton lines={4} />}
    >
      {rows.filter((row) => !hidden.includes(row.id)).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("welcome.noSuggestions")}
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {rows
            .filter((row) => !hidden.includes(row.id))
            .map((suggestion) => (
              <li key={suggestion.id}>
                <WelcomeFollowRow
                  suggestion={suggestion}
                  onFollowed={() => setHidden((ids) => [...ids, suggestion.id])}
                />
              </li>
            ))}
        </ul>
      )}
    </LoadingArea>
  );
}

function WelcomeFollowRow({
  suggestion,
  onFollowed,
}: {
  suggestion: FollowSuggestion;
  onFollowed: () => void;
}) {
  const t = useT();
  const toggleFollow = useToggleFollow(suggestion.id);
  const queryClient = useQueryClient();
  const displayName = suggestion.displayName ?? suggestion.username;

  async function follow() {
    const result = await toggleFollow.mutateAsync();
    if (result.ok) {
      // The refetch drops the row everywhere: the RPC never suggests
      // someone the caller already follows.
      void queryClient.invalidateQueries({
        queryKey: [...FOLLOW_SUGGESTIONS_QUERY_KEY],
      });
      toast.success(t("followSuggest.followedToast", { name: displayName }));
      onFollowed();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/u/${suggestion.username}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md focus-visible:outline-2"
      >
        <UserAvatar
          username={suggestion.username}
          displayName={suggestion.displayName}
          avatarSpecies={suggestion.avatarSpecies}
          size="sm"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm">{displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">
            @{suggestion.username}
          </span>
        </span>
      </Link>
      <Button
        size="sm"
        variant="outline"
        loading={toggleFollow.isPending}
        disabled={toggleFollow.isPending}
        onClick={() => void follow()}
      >
        {t("followSuggest.follow")}
      </Button>
    </div>
  );
}

function GroupsStep() {
  const t = useT();
  const discover = useDiscoverGroups();
  const rows = [...(discover.data ?? [])]
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, WELCOME_ROW_LIMIT);

  return (
    <LoadingArea
      pending={discover.isPending}
      label={t("groups.loadingGroups")}
      skeleton={<TextLinesSkeleton lines={4} />}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("welcome.noGroups")}</p>
      ) : (
        <ul className="grid gap-1.5">
          {rows.map((group) => (
            <li key={group.id}>
              <WelcomeGroupRow group={group} />
            </li>
          ))}
        </ul>
      )}
    </LoadingArea>
  );
}

interface WelcomeGroupRowProps {
  group: {
    id: string;
    slug: string;
    name: string;
    memberCount: number;
  };
}

function WelcomeGroupRow({ group }: WelcomeGroupRowProps) {
  const t = useT();
  const joinGroup = useJoinGroup();
  const [joined, setJoined] = useState(false);
  const countKey =
    group.memberCount === 1
      ? ("groups.memberCountOne" as const)
      : ("groups.memberCountMany" as const);

  async function join() {
    const result = await joinGroup.mutateAsync({ groupId: group.id });
    if (result.ok) {
      toast.success(t("groups.joinedToast"));
      setJoined(true);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/g/${group.slug}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md focus-visible:outline-2"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm">{group.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t(countKey, { n: group.memberCount })}
          </span>
        </span>
      </Link>
      <Button
        size="sm"
        variant="outline"
        loading={joinGroup.isPending}
        disabled={joined || joinGroup.isPending}
        onClick={() => void join()}
      >
        {joined ? t("common.done") : t("groups.join")}
      </Button>
    </div>
  );
}
