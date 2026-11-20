/**
 * The Follow/Following button on a follow notification, so the reader can
 * follow the actor back without leaving the page. Signed-out visitors
 * see nothing: there is no account to follow from.
 *
 * The `following` state comes from the page's one batched useFollowStates
 * query (one request for every row, not one per row); the optimistic
 * flip lives in useToggleFollow, which updates the batched maps.
 */

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { useToggleFollow } from "@/lib/social";
import type { NotificationActor } from "@/lib/notifications/types";

interface FollowBackButtonProps {
  actor: NotificationActor;
  /** Whether the viewer already follows the actor (the batched lookup). */
  following: boolean;
}

export function FollowBackButton({ actor, following }: FollowBackButtonProps) {
  const { user } = useAuth();
  const t = useT();
  const toggleFollow = useToggleFollow(actor.id);

  if (!user) {
    return null;
  }

  async function handleToggle(): Promise<void> {
    const result = await toggleFollow.mutateAsync();
    if (result.ok) {
      toast.success(
        following
          ? t("notifications.unfollowedToast", { name: actor.username })
          : t("notifications.followedToast", { name: actor.username }),
      );
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Button
      size="sm"
      variant={following ? "secondary" : "outline"}
      disabled={toggleFollow.isPending}
      onClick={() => void handleToggle()}
    >
      {following
        ? t("notifications.followingBack")
        : t("notifications.followBack")}
    </Button>
  );
}
