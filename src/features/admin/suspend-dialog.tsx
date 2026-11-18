import { useState } from "react";
import { CalendarClockIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import {
  PERMANENT_SUSPENSION_DAYS,
  suspendUntil,
  useSuspendUser,
} from "@/lib/social/moderation";
import { MODERATION_REASON_MAX } from "@/lib/social/validation";
import { useT } from "@/lib/i18n/t";

const SUSPEND_PRESETS = [
  { labelKey: "moderation.duration1", days: 1 },
  { labelKey: "moderation.duration7", days: 7 },
  { labelKey: "moderation.duration30", days: 30 },
  { labelKey: "moderation.durationPermanent", days: PERMANENT_SUSPENSION_DAYS },
] as const;

/**
 * Controlled suspend dialog: a required reason plus a duration choice.
 * Shared by the admin reports page and the profile overflow menu.
 */
export function SuspendDialog({
  userId,
  client = supabase,
  open,
  onOpenChange,
  onSuspended,
}: {
  userId: string;
  client?: AppSupabaseClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuspended?: () => void;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const suspendUser = useSuspendUser(client);
  const busy = suspendUser.isPending;

  const suspend = async (days: number) => {
    const trimmed = reason.trim();
    if (trimmed === "") {
      toast.error(t("moderation.enterSuspendReason"));
      return;
    }
    const result = await suspendUser.mutateAsync({
      userId,
      until: suspendUntil(days),
      reason: trimmed,
    });
    if (result.ok) {
      toast.success(t("moderation.suspendedToast"));
      setReason("");
      onOpenChange(false);
      onSuspended?.();
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("publicProfile.suspendUser")}</DialogTitle>
          <DialogDescription>
            {t("moderation.suspendDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Textarea
            aria-label={t("moderation.suspendReasonAria")}
            placeholder={t("moderation.suspendReasonAria")}
            value={reason}
            maxLength={MODERATION_REASON_MAX}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {reason.length}/{MODERATION_REASON_MAX}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t("common.cancel")}
          </Button>
          {SUSPEND_PRESETS.map((preset) => (
            <Button
              key={preset.days}
              variant="destructive"
              onClick={() => {
                void suspend(preset.days);
              }}
              disabled={busy || reason.trim() === ""}
            >
              {busy ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <CalendarClockIcon />
              )}
              {t(preset.labelKey)}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
