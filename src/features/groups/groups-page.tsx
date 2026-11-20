import { useState } from "react";
import { Link } from "react-router";
import { SearchIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SegmentedControl } from "@/components/segmented-control";
import { buttonSmTouchClass } from "@/components/touch-targets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupListSkeleton, LoadingArea } from "@/components/skeletons";
import { useAuth } from "@/lib/auth/use-auth";
import type { TranslationKey } from "@/lib/i18n/en";
import { useT } from "@/lib/i18n/t";
import {
  useDiscoverGroups,
  useMyGroups,
  type DiscoverGroup,
  type GroupSummary,
} from "@/lib/groups/queries";
import { useJoinGroup } from "@/lib/groups/mutations";
import {
  filterDiscoverGroups,
  sortDiscoverGroups,
  type DiscoverSort,
} from "@/lib/groups/discovery";
import type { GroupCategory, GroupLanguage } from "@/lib/groups/validation";

const CATEGORY_LABELS: Record<GroupCategory, TranslationKey> = {
  doubles: "groups.categoryDoubles",
  singles: "groups.categorySingles",
  team_building: "groups.categoryTeamBuilding",
  regional: "groups.categoryRegional",
};

const LANGUAGE_LABELS: Record<GroupLanguage, TranslationKey> = {
  en: "groups.languageEn",
  ja: "groups.languageJa",
};

const ALL_OPTION = "all";

/**
 * Groups home: the signed-in user's groups and the public directory. The
 * Discover tab searches by name or address, sorts by member count (Popular)
 * or creation date (New), and filters by category and language; public
 * groups can be joined straight from the list. Invite-only groups never
 * appear in discovery.
 */
export function GroupsPage() {
  const { user } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<"mine" | "discover">(
    user ? "mine" : "discover",
  );
  const myGroups = useMyGroups();

  return (
    <Page
      title={t("groups.homeTitle")}
      description={t("groups.homeDescription")}
      actions={
        user ? (
          <Button asChild size="sm" className={buttonSmTouchClass}>
            <Link to="/groups/new">{t("groups.createGroup")}</Link>
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
            <MineList
              query={myGroups}
              emptyTitle={t("groups.noGroupsYetTitle")}
              emptyDescription={t("groups.noGroupsYetDescription")}
            />
          ) : (
            <EmptyState
              title={t("groups.signInToSeeGroups")}
              action={
                <Button asChild size="sm" className={buttonSmTouchClass}>
                  <Link to="/login?returnTo=/groups">{t("common.signIn")}</Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <DiscoverTab
          myGroupIds={new Set((myGroups.data ?? []).map((group) => group.id))}
        />
      )}
    </Page>
  );
}

function DiscoverTab({ myGroupIds }: { myGroupIds: Set<string> }) {
  const { user } = useAuth();
  const t = useT();
  const discover = useDiscoverGroups();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DiscoverSort>("popular");
  const [category, setCategory] = useState<GroupCategory | null>(null);
  const [language, setLanguage] = useState<GroupLanguage | null>(null);

  const groups = discover.data ?? [];
  const filtered = sortDiscoverGroups(
    filterDiscoverGroups(groups, { search, category, language }),
    sort,
  );
  const filtersActive =
    search.trim() !== "" || category !== null || language !== null;

  return (
    <div className="mt-4">
      <div className="grid gap-2">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label={t("groups.discoverSearchAria")}
            placeholder={t("groups.discoverSearchAria")}
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            aria-label={t("groups.sortAria")}
            value={sort}
            onValueChange={(value) => setSort(value as DiscoverSort)}
            options={[
              { value: "popular", label: t("groups.sortPopular") },
              { value: "new", label: t("groups.sortNew") },
            ]}
          />
          <Select
            value={category ?? ALL_OPTION}
            onValueChange={(value) =>
              setCategory(
                value === ALL_OPTION ? null : (value as GroupCategory),
              )
            }
          >
            <SelectTrigger
              aria-label={t("groups.categoryFilter")}
              className="w-auto max-sm:h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION} className="max-sm:py-3">
                {t("groups.categoryAll")}
              </SelectItem>
              {(Object.keys(CATEGORY_LABELS) as GroupCategory[]).map(
                (value) => (
                  <SelectItem key={value} value={value} className="max-sm:py-3">
                    {t(CATEGORY_LABELS[value])}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Select
            value={language ?? ALL_OPTION}
            onValueChange={(value) =>
              setLanguage(
                value === ALL_OPTION ? null : (value as GroupLanguage),
              )
            }
          >
            <SelectTrigger
              aria-label={t("groups.languageFilter")}
              className="w-auto max-sm:h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION} className="max-sm:py-3">
                {t("groups.languageAll")}
              </SelectItem>
              {(Object.keys(LANGUAGE_LABELS) as GroupLanguage[]).map(
                (value) => (
                  <SelectItem key={value} value={value} className="max-sm:py-3">
                    {t(LANGUAGE_LABELS[value])}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4">
        {discover.isError ? (
          <ErrorState
            title={t("groups.listError")}
            description={discover.error.message}
            action={
              <Button
                variant="outline"
                size="sm"
                className={buttonSmTouchClass}
                onClick={() => void discover.refetch()}
              >
                {t("common.retry")}
              </Button>
            }
          />
        ) : (
          <LoadingArea
            pending={discover.isPending}
            label={t("groups.loadingGroups")}
            skeleton={<GroupListSkeleton />}
          >
            {filtered.length === 0 ? (
              <EmptyState
                title={
                  filtersActive
                    ? t("groups.noMatchesTitle")
                    : t("groups.noPublicGroups")
                }
                description={
                  filtersActive
                    ? search.trim() !== ""
                      ? t("groups.noMatchesDescription", {
                          query: search.trim(),
                        })
                      : t("groups.noFilterMatches")
                    : t("groups.createFirst")
                }
              />
            ) : (
              <ul className="grid gap-3">
                {filtered.map((group) => (
                  <li key={group.id} className="flex items-stretch gap-2">
                    <div className="min-w-0 flex-1">
                      <DiscoverCard group={group} />
                    </div>
                    {user && !myGroupIds.has(group.id) && (
                      <JoinButton group={group} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </LoadingArea>
        )}
      </div>
    </div>
  );
}

function DiscoverCard({ group }: { group: DiscoverGroup }) {
  const t = useT();
  return (
    <Link
      to={`/g/${group.slug}`}
      className="group block h-full rounded-md focus-visible:outline-2"
    >
      <div className="h-full rounded-md border bg-card p-4 transition-colors group-hover:border-primary/60">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-heading truncate text-base font-semibold">
            {group.name}
          </span>
          <Badge variant="secondary">
            <UsersIcon aria-hidden />
            {group.memberCount === 1
              ? t("groups.memberCountOne", { n: group.memberCount })
              : t("groups.memberCountMany", { n: group.memberCount })}
          </Badge>
          {group.category && (
            <Badge variant="secondary">
              {t(CATEGORY_LABELS[group.category])}
            </Badge>
          )}
          {group.language && (
            <Badge variant="secondary">
              {t(LANGUAGE_LABELS[group.language])}
            </Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {group.description ?? t("groups.noDescription")}
        </p>
      </div>
    </Link>
  );
}

function JoinButton({ group }: { group: DiscoverGroup }) {
  const t = useT();
  const joinGroup = useJoinGroup();

  async function join() {
    const result = await joinGroup.mutateAsync({ groupId: group.id });
    if (result.ok) {
      toast.success(t("groups.joinedToast"));
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className={`self-center ${buttonSmTouchClass}`}
      loading={joinGroup.isPending}
      disabled={joinGroup.isPending}
      onClick={() => void join()}
    >
      {t("groups.join")}
    </Button>
  );
}

interface MineListProps {
  query: ReturnType<typeof useMyGroups>;
  emptyTitle: string;
  emptyDescription: string;
}

function MineList({ query, emptyTitle, emptyDescription }: MineListProps) {
  const t = useT();
  if (query.isError) {
    return (
      <ErrorState
        title={t("groups.listError")}
        description={query.error.message}
        action={
          <Button
            variant="outline"
            size="sm"
            className={buttonSmTouchClass}
            onClick={() => void query.refetch()}
          >
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const groups = query.data ?? [];

  return (
    <LoadingArea
      pending={query.isPending}
      label={t("groups.loadingGroups")}
      skeleton={<GroupListSkeleton />}
    >
      {groups.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="grid gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}
    </LoadingArea>
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
          {group.category && (
            <Badge variant="secondary">
              {t(CATEGORY_LABELS[group.category])}
            </Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {group.description ?? t("groups.noDescription")}
        </p>
      </div>
    </Link>
  );
}
