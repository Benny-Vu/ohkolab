import { useState } from "react";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CalculatorIcon,
  ChartColumnIcon,
  ConstructionIcon,
  LogInIcon,
  SwordsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/use-auth";
import { socialAvailability } from "@/lib/social/availability";
import { useFeed } from "@/lib/social/queries";
import { Composer } from "@/features/feed/composer";
import { PostList } from "@/features/feed/post-list";

interface Tool {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const TOOLS: Tool[] = [
  {
    to: "/calc",
    title: "Damage calculator",
    description: "Check damage ranges and KO chances with Champions mechanics.",
    icon: CalculatorIcon,
  },
  {
    to: "/teams",
    title: "Team builder",
    description: "Build a team of six, check its type coverage and export it.",
    icon: SwordsIcon,
  },
  {
    to: "/meta",
    title: "Metagame",
    description: "Usage, common sets and speed tiers for singles and doubles.",
    icon: ChartColumnIcon,
  },
];

/**
 * Home screen: the community feed once the social layer is ready, with the
 * tools intro as the fallback.
 */
export function HomePage() {
  if (socialAvailability() !== "ready") {
    return <ToolsIntro />;
  }
  return <FeedHome />;
}

function ToolsIntro() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-primary">OHKO</span>Lab
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Tools and community for Pokémon Champions: calculate damage, build teams
        and follow the metagame.
      </p>

      <ul className="mt-8 grid gap-3">
        {TOOLS.map((tool) => (
          <li key={tool.to}>
            <Link
              to={tool.to}
              className="group block rounded-xl focus-visible:outline-2"
            >
              <Card className="transition-colors group-hover:border-primary/60">
                <CardHeader className="flex flex-row items-center gap-4">
                  <tool.icon
                    className="size-6 shrink-0 text-primary"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <CardTitle>{tool.title}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </div>
                  <ArrowRightIcon
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted-foreground md:hidden">
        OHKOLab is an unofficial fan project, not affiliated with Nintendo, Game
        Freak, Creatures or The Pokémon Company.
      </p>
    </div>
  );
}

function FeedHome() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"latest" | "following">("latest");
  const feed = useFeed(tab);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-primary">OHKO</span>Lab
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Tools and community for Pokémon Champions: calculate damage, build teams
        and follow the metagame.
      </p>

      {user && (
        <div className="mt-6">
          <Composer />
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "latest" | "following")}
        className="mt-6"
      >
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
          <Button asChild variant="outline" size="sm">
            <Link to="/groups">
              <UsersIcon aria-hidden />
              Groups
            </Link>
          </Button>
        </div>

        <TabsContent value="latest" className="mt-4">
          <FeedTabContent
            feed={feed}
            emptyMessage="No posts yet. Be the first!"
          />
        </TabsContent>
        <TabsContent value="following" className="mt-4">
          {user ? (
            <FeedTabContent
              feed={feed}
              emptyMessage="No posts from people you follow yet."
            />
          ) : (
            <Card size="sm" className="border-dashed p-6 text-center">
              <LogInIcon
                className="mx-auto size-6 text-muted-foreground"
                aria-hidden
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to see posts from trainers you follow.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/login?returnTo=/">Sign in</Link>
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface FeedTabContentProps {
  feed: ReturnType<typeof useFeed>;
  emptyMessage: string;
}

function FeedTabContent({ feed, emptyMessage }: FeedTabContentProps) {
  if (feed.isPending) {
    return (
      <div className="grid gap-3" aria-label="Loading posts">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (feed.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden />
        <AlertTitle>Could not load the feed</AlertTitle>
        <AlertDescription>{feed.error.message}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void feed.refetch()}
        >
          Try again
        </Button>
      </Alert>
    );
  }

  const posts = feed.data?.pages.flat() ?? [];

  return (
    <div className="grid gap-3">
      {posts.length === 0 ? (
        <Card size="sm" className="border-dashed p-6 text-center">
          <ConstructionIcon
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
        </Card>
      ) : (
        <PostList posts={posts} />
      )}
      {feed.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
        >
          {feed.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
