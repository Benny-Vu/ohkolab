import { useState } from "react";
import { useNavigate } from "react-router";
import { LoaderCircleIcon, MessageCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import type { Profile } from "@/lib/auth/types";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { useCanMessage } from "@/lib/messages/queries";
import { useStartConversation } from "@/lib/messages/mutations";

/**
 * The "Message" button on a public profile. It appears only when the server
 * says the signed-in player may start a conversation (`can_message`); the
 * rules are never duplicated client side. Clicking starts (or reuses) the
 * conversation and opens the thread.
 */
export function ProfileMessageButton({
  profile,
  client = supabase,
}: {
  profile: Pick<Profile, "id">;
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canMessage = useCanMessage(profile.id, client);
  const startConversation = useStartConversation(client);
  const [busy, setBusy] = useState(false);

  if (
    !directMessagesEnabled() ||
    !user ||
    user.id === profile.id ||
    canMessage.data !== true
  ) {
    return null;
  }

  const start = async () => {
    setBusy(true);
    const result = await startConversation.mutateAsync(profile.id);
    setBusy(false);
    if (result.ok) {
      navigate(`/messages/${result.data}`);
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => void start()}
    >
      {busy ? (
        <LoaderCircleIcon className="animate-spin" aria-hidden />
      ) : (
        <MessageCircleIcon aria-hidden />
      )}
      {t("messages.messageButton")}
    </Button>
  );
}
