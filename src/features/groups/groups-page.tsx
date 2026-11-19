import { useState } from "react";
import { Link } from "react-router";
import { LoaderCircleIcon, PlusIcon, SearchIcon } from "lucide-react";

import { Page } from "@/components/page";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SegmentedControl } from "@/components/segmented-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import {
  useMyGroups,
  usePublicGroups,
  type GroupSummary,
} from "@/lib/groups/queries";

/**
 * Groups home: the signed-in user's groups and the public directory, with a
 * name search on Discover.
 */
export function GroupsPage() {
  const { user } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<"mine" | "discover">(
    user ? "mine" : "discover",
  );
  const [search, setSearch] = useState("");
  const myGroups = useMyGroups();
  const publicGroups = usePublicGroups(search);

  return (
    <Page
      title={t("groups.homeTitle")}
      description={t("groups.homeDescription")}
      actions={
        user ? (
          <Button asChild size="sm">
            <Link to="/groups/new">
              <PlusIcon aria-hidden />
              {t("groups.createGroup")}
            </Link>
          </Button>
        ) : null
      }
    >
      <SegmentedControl
        aria-label={t("groups.sectionsAriaGroups")}
        options={[
          { value: "mine", label: t("groups.myGroups") },
          { value: "discover", label: t("groups.discover") },
        ]}
        value={tab}
        onValueChange={(value) => setTab(value as "mine" | "discover")}
      />

      {tab === "mine" ? (
        <div className="mt-4">
          {user ? (
            <GroupList
              query={myGroups}
              emptyTitle={t("groups.noGroupsYetTitle")}
              emptyDescription={t("groups.noGroupsYetDescription")}
            />
          ) : (
            <EmptyState
              title={t("groups.signInToSeeGroups")}
              action={
                <Button asChild size="sm">
                  <Link to="/login?returnTo=/groups">{t("common.signIn")}</Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative w-full">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                aria-label={t("groups.searchAria")}
                placeholder={t("groups.searchAria")}
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {publicGroups.isFetching && (
              <LoaderCircleIcon
                className="size-4 shrink-0 animate-spin text-muted-foreground"
                aria-hidden
              />
            )}
          </div>
          <GroupList
            query={publicGroups}
            emptyTitle={
              search.trim() === ""
                ? t("groups.noPublicGroups")
                : t("groups.noMatchesTitle")
            }
            emptyDescription={
              search.trim() === ""
                ? t("groups.createFirst")
                : t("groups.noMatchesDescription", {
                    query: search.trim(),
                  })
            }
          />
        </div>
      )}
    </Page>
  );
}

interface GroupListProps {
  query: ReturnType<typeof useMyGroups> | ReturnType<typeof usePublicGroups>;
  emptyTitle: string;
  emptyDescription: string;
}

function GroupList({ query, emptyTitle, emptyDescription }: GroupListProps) {
  const t = useT();
  if (query.isPending) {
    return (
      <div
        className="grid gap-3"
        role="status"
        aria-label={t("groups.loadingGroups")}
      >
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t("groups.listError")}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const groups = query.data ?? [];

  if (groups.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="grid gap-3">
      {groups.map((group) => (
        <li key={group.id}>
          <GroupCard group={group} />
        </li>
      ))}
    </ul>
  );
}

function GroupCard({ group }: { group: GroupSummary }) {
  const t = useT();
  return (
    <Link
      to={`/g/${group.slug}`}
      className="group block rounded-md focus-visible:outline-2"
    >
      <div className="rounded-md border bg-card p-4 transition-colors group-hover:border-primary/60">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-heading truncate text-base font-semibold">
            {group.name}
          </span>
          <Badge variant="secondary">
            {group.visibility === "invite_only"
              ? t("groups.inviteOnly")
              : t("groups.publicBadge")}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {group.description ?? t("groups.noDescription")}
        </p>
      </div>
    </Link>
  );
}
