import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
import { LoadingArea, TextLinesSkeleton } from "@/components/skeletons";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { useToggleFollow } from "@/lib/social/mutations";
import {
  dismissedSuggestionsKey,
  writeDismissedSuggestion,
} from "@/lib/social/suggestion-dismissals";
import {
  FOLLOW_SUGGESTIONS_QUERY_KEY,
  useFollowSuggestions,
  type FollowSuggestion,
} from "@/lib/social/suggestions";

/**
 * "People to follow": the suggest_users module for the home page and empty
 * feeds. The ranking runs server side; this module renders the results,
 * follows from the row, and remembers dismissals per user in localStorage.
 * It renders nothing while signed out, loading-empty or after everything
 * was dismissed, so it can sit above any feed.
 */
export function PeopleToFollow() {
  const { user } = useAuth();
  const t = useT();
  const suggestions = useFollowSuggestions();
  // Rows removed this session: after a follow (the refetch drops them too)
  // or a dismissal (which is also written to localStorage).
  const [hidden, setHidden] = useState<string[]>([]);

  if (!user) {
    return null;
  }

  const hide = (suggestionId: string) => {
    setHidden((ids) =>
      ids.includes(suggestionId) ? ids : [...ids, suggestionId],
    );
  };

  // A follow that the server refused puts the row back.
  const unhide = (suggestionId: string) => {
    setHidden((ids) => ids.filter((id) => id !== suggestionId));
  };

  const dismiss = (suggestionId: string) => {
    writeDismissedSuggestion(dismissedSuggestionsKey(user.id), suggestionId);
    hide(suggestionId);
  };

  if (suggestions.isError) {
    return (
      <section
        aria-label={t("followSuggest.title")}
        className="rounded-md border bg-card p-4"
      >
        <h2 className="font-heading text-sm font-semibold">
          {t("followSuggest.title")}
        </h2>
        <ErrorState
          title={t("followSuggest.loadError")}
          description={suggestions.error.message}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void suggestions.refetch()}
            >
              {t("common.retry")}
            </Button>
          }
          className="mt-3 border-none bg-transparent px-0 py-2"
        />
      </section>
    );
  }

  const visible = (suggestions.data ?? []).filter(
    (suggestion) => !hidden.includes(suggestion.id),
  );

  return (
    <LoadingArea
      pending={suggestions.isPending}
      label={t("followSuggest.loading")}
      skeleton={
        <section className="rounded-md border bg-card p-4">
          <TextLinesSkeleton lines={3} />
        </section>
      }
    >
      {visible.length === 0 ? null : (
        <section
          aria-label={t("followSuggest.title")}
          className="rounded-md border bg-card p-4"
        >
          <h2 className="font-heading text-sm font-semibold">
            {t("followSuggest.title")}
          </h2>
          <ul className="mt-2 grid gap-1.5">
            {visible.map((suggestion) => (
              <li key={suggestion.id}>
                <SuggestionRow
                  suggestion={suggestion}
                  onFollowed={() => hide(suggestion.id)}
                  onFailed={() => unhide(suggestion.id)}
                  onDismissed={() => dismiss(suggestion.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </LoadingArea>
  );
}

function formatLabelKey(mainFormat: FollowSuggestion["mainFormat"]) {
  switch (mainFormat) {
    case "singles":
      return "followSuggest.formatSingles" as const;
    case "doubles":
      return "followSuggest.formatDoubles" as const;
    case "both":
      return "followSuggest.formatBoth" as const;
    default:
      return null;
  }
}

function SuggestionRow({
  suggestion,
  onFollowed,
  onFailed,
  onDismissed,
}: {
  suggestion: FollowSuggestion;
  onFollowed: () => void;
  onFailed: () => void;
  onDismissed: () => void;
}) {
  const t = useT();
  const toggleFollow = useToggleFollow(suggestion.id);
  const queryClient = useQueryClient();
  const formatKey = formatLabelKey(suggestion.mainFormat);
  const displayName = suggestion.displayName ?? suggestion.username;

  async function follow() {
    // The row disappears at once; a refused follow brings it back.
    onFollowed();
    const result = await toggleFollow.mutateAsync();
    if (result.ok) {
      // The RPC never suggests someone the caller follows, so the refetch
      // drops the row everywhere the module is rendered.
      void queryClient.invalidateQueries({
        queryKey: [...FOLLOW_SUGGESTIONS_QUERY_KEY],
      });
      toast.success(t("followSuggest.followedToast", { name: displayName }));
    } else {
      onFailed();
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
          {formatKey && (
            <span className="block truncate text-xs text-muted-foreground">
              {t(formatKey)}
            </span>
          )}
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
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={t("followSuggest.dismiss", { name: suggestion.username })}
        onClick={onDismissed}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
