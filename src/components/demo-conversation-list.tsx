import { ensureEnglishDomain } from "@/lib/i18n/en-loader";
import type { TranslationKey } from "@/lib/i18n/en";
import { useT } from "@/lib/i18n/t";

import { ExampleBadge } from "@/components/demo-badge";
import { UserAvatar } from "@/components/user-avatar";

// The sample names and previews live in the battles dictionary. The messages
// route only loads the community dictionary, so this list loads its own
// overlay when its module lands with the route chunk — before first render.
void ensureEnglishDomain("battles").catch(() => {});

interface DemoConversationFixture {
  username: string;
  avatarSpecies: string;
  nameKey: TranslationKey;
  previewKey: TranslationKey;
}

const DEMO_CONVERSATIONS: DemoConversationFixture[] = [
  {
    username: "rikachu",
    avatarSpecies: "Garchomp",
    nameKey: "demo.conversation1Name",
    previewKey: "demo.conversation1Preview",
  },
  {
    username: "kendoubles",
    avatarSpecies: "Flutter Mane",
    nameKey: "demo.conversation2Name",
    previewKey: "demo.conversation2Preview",
  },
  {
    username: "mioteams",
    avatarSpecies: "Amoonguss",
    nameKey: "demo.conversation3Name",
    previewKey: "demo.conversation3Preview",
  },
];

/**
 * Sample conversations for recording mode (?demo=1), shown in place of the
 * messages page's signed-out state. Render-only: no thread links and no
 * actions — nothing here opens, posts or changes data. The names and
 * previews come from the battles dictionary, so Japanese recordings show
 * Japanese sample content.
 */
export function DemoConversationList() {
  const t = useT();
  return (
    <ul className="grid gap-2">
      {DEMO_CONVERSATIONS.map((conversation) => (
        <li
          key={conversation.username}
          className="flex items-center gap-3 rounded-md border bg-card p-3"
        >
          <UserAvatar
            username={conversation.username}
            displayName={t(conversation.nameKey)}
            avatarSpecies={conversation.avatarSpecies}
            size="sm"
          />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {t(conversation.nameKey)}
              </span>
              <ExampleBadge />
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t(conversation.previewKey)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
