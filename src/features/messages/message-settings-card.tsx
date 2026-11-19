import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { useMessageSetting, type WhoCanMessage } from "@/lib/messages/queries";
import { useUpdateMessageSetting } from "@/lib/messages/mutations";

const OPTION_LABELS: Record<WhoCanMessage, TranslationKey> = {
  friends: "messages.settingsFriends",
  following: "messages.settingsFollowing",
  nobody: "messages.settingsNobody",
};

/**
 * The "who can message me" settings card. Renders nothing and queries
 * nothing while the flag is off; the account page mounts it lazily.
 */
export function MessageSettingsCard({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const setting = useMessageSetting(client);
  const update = useUpdateMessageSetting(client);

  if (!directMessagesEnabled()) {
    return null;
  }

  const change = async (value: WhoCanMessage) => {
    const result = await update.mutateAsync(value);
    if (result.ok) {
      toast.success(t("messages.settingsSaved"));
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("messages.settingsTitle")}</CardTitle>
        <CardDescription>{t("messages.settingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Label htmlFor="who-can-message" className="sr-only">
          {t("messages.settingsAria")}
        </Label>
        <Select
          value={setting.data}
          onValueChange={(value) => {
            void change(value as WhoCanMessage);
          }}
          disabled={update.isPending || setting.data === undefined}
        >
          <SelectTrigger
            id="who-can-message"
            aria-label={t("messages.settingsAria")}
          >
            <SelectValue>
              {setting.data !== undefined
                ? t(OPTION_LABELS[setting.data])
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(OPTION_LABELS) as WhoCanMessage[]).map((value) => (
              <SelectItem key={value} value={value}>
                {t(OPTION_LABELS[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
