import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { isPushAvailable } from "@/lib/push/flag";
import {
  DEFAULT_PUSH_SETTINGS,
  PUSH_SETTING_KINDS,
  usePushSettings,
  useUpdatePushSettings,
  type PushSettingKind,
  type PushSettings,
} from "@/lib/push/settings";

/**
 * The push notification settings: the master switch plus one switch per
 * notification kind. The profile page mounts it lazily while VITE_PUSH is
 * on; it renders (and queries) nothing on the web or in flag-off builds.
 */

const KIND_LABELS: Record<PushSettingKind, TranslationKey> = {
  likes: "profile.pushLikes",
  comments: "profile.pushComments",
  follows: "profile.pushFollows",
  groups: "profile.pushGroups",
  messages: "profile.pushMessages",
};

function SwitchRow({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="text-sm font-normal text-foreground">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function PushSettingsCard() {
  const t = useT();
  const settings = usePushSettings();
  const update = useUpdatePushSettings();

  if (!isPushAvailable()) return null;

  const value: PushSettings = settings.data ?? DEFAULT_PUSH_SETTINGS;

  const save = (next: PushSettings) => {
    void update.mutateAsync(next).then((saved) => {
      if (saved) {
        toast.success(t("profile.pushSavedToast"));
      } else {
        toast.error(t("profile.pushFailedToast"));
      }
    });
  };

  return (
    <section className="grid gap-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {t("profile.pushSection")}
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.pushMasterTitle")}</CardTitle>
          <CardDescription>
            {t("profile.pushMasterDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {settings.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <SwitchRow
                id="push-enabled"
                label={t("profile.pushAllLabel")}
                checked={value.enabled}
                disabled={update.isPending}
                onCheckedChange={(checked) =>
                  save({ ...value, enabled: checked })
                }
              />
              <div
                className="grid gap-4 border-t pt-4"
                aria-disabled={!value.enabled}
              >
                {PUSH_SETTING_KINDS.map((kind) => (
                  <SwitchRow
                    key={kind}
                    id={`push-${kind}`}
                    label={t(KIND_LABELS[kind])}
                    checked={value[kind]}
                    disabled={update.isPending}
                    onCheckedChange={(checked) =>
                      save({ ...value, [kind]: checked })
                    }
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
