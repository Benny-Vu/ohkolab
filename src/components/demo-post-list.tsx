import { HeartIcon, MessageCircleIcon } from "lucide-react";

import { ExampleBadge } from "@/components/demo-badge";
import { UserAvatar } from "@/components/user-avatar";
import type { TranslationKey } from "@/lib/i18n/en";
import { useT } from "@/lib/i18n/t";

/**
 * Sample feed posts for recording mode (?demo=1), shown in place of the
 * feed's empty state. Render-only: no like, comment or overflow actions
 * and no links — nothing here posts or changes data. The bodies come from
 * the community dictionary, so Japanese recordings show Japanese sample
 * content.
 */
interface DemoPostFixture {
  username: string;
  displayName: string;
  avatarSpecies: string;
  bodyKey: TranslationKey;
  likes: number;
  comments: number;
}

const DEMO_POSTS: DemoPostFixture[] = [
  {
    username: "rikachu",
    displayName: "Rika",
    avatarSpecies: "Garchomp",
    bodyKey: "demo.post1Body",
    likes: 24,
    comments: 3,
  },
  {
    username: "kendoubles",
    displayName: "Kenta",
    avatarSpecies: "Flutter Mane",
    bodyKey: "demo.post2Body",
    likes: 41,
    comments: 7,
  },
  {
    username: "mioteams",
    displayName: "Mio",
    avatarSpecies: "Amoonguss",
    bodyKey: "demo.post3Body",
    likes: 12,
    comments: 2,
  },
];

/** Sample posts styled like the real feed, each marked as an example. */
export function DemoPostList() {
  const t = useT();
  return (
    <ul className="grid gap-3">
      {DEMO_POSTS.map((post) => (
        <li key={post.username} className="rounded-md border bg-card p-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              username={post.username}
              displayName={post.displayName}
              avatarSpecies={post.avatarSpecies}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{post.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                @{post.username}
              </p>
            </div>
            <ExampleBadge />
          </div>
          <p className="mt-3 text-sm">{t(post.bodyKey)}</p>
          <p className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HeartIcon className="size-3.5" aria-hidden />
              <span className="tabular-nums">{post.likes}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircleIcon className="size-3.5" aria-hidden />
              <span className="tabular-nums">{post.comments}</span>
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}
