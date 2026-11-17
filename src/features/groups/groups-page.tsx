import { useState } from "react";
import { Link } from "react-router";
import {
  ConstructionIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";

import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/use-auth";
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
  const [tab, setTab] = useState<"mine" | "discover">(
    user ? "mine" : "discover",
  );
  const [search, setSearch] = useState("");
  const myGroups = useMyGroups();
  const publicGroups = usePublicGroups(search);

  return (
    <Page
      title="Groups"
      description="Communities for teams, formats and everything Champions."
      actions={
        user ? (
          <Button asChild size="sm">
            <Link to="/groups/new">
              <PlusIcon aria-hidden />
              Create group
            </Link>
          </Button>
        ) : null
      }
    >
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "mine" | "discover")}
      >
        <TabsList>
          <TabsTrigger value="mine">My groups</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          {user ? (
            <GroupList
              query={myGroups}
              emptyMessage="You have not joined any groups yet. Find one on Discover."
            />
          ) : (
            <Card size="sm" className="border-dashed p-6 text-center">
              <UsersIcon
                className="mx-auto size-6 text-muted-foreground"
                aria-hidden
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to see your groups.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/login?returnTo=/groups">Sign in</Link>
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discover" className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative w-full">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                aria-label="Search groups by name"
                placeholder="Search groups by name"
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
            emptyMessage={
              search.trim() === ""
                ? "No public groups yet. Create the first one!"
                : `No groups match "${search.trim()}".`
            }
          />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

interface GroupListProps {
  query: ReturnType<typeof useMyGroups> | ReturnType<typeof usePublicGroups>;
  emptyMessage: string;
}

function GroupList({ query, emptyMessage }: GroupListProps) {
  if (query.isPending) {
    return (
      <div className="grid gap-3" aria-label="Loading groups">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  const groups = query.data ?? [];

  if (groups.length === 0) {
    return (
      <Card size="sm" className="border-dashed p-6 text-center">
        <ConstructionIcon
          className="mx-auto size-6 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
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
  return (
    <Link
      to={`/g/${group.slug}`}
      className="group block rounded-xl focus-visible:outline-2"
    >
      <Card className="transition-colors group-hover:border-primary/60">
        <CardHeader>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CardTitle className="truncate">{group.name}</CardTitle>
            <Badge variant="secondary">
              {group.visibility === "invite_only" ? "Invite only" : "Public"}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {group.description ?? "No description yet."}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
