import { useState } from "react";
import { ZapIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buttonSmTouchClass,
  buttonTouchClass,
} from "@/components/touch-targets";
import { getLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { useBattleFormat } from "@/lib/preferences";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { useCreateBattleRequest } from "@/lib/battles/mutations";
import { createErrorMessage } from "@/features/battles/board/create-error-message";
import { buildPractiseRequest } from "@/features/battles/board/practise-now";

/**
 * The one-tap "Practise now" action on the battle board: one confirm
 * dialog, then an open request for a casual match in the next hour, in
 * the user's current battle format, with no team and no note. The format
 * and language follow the app preference and the site locale, exactly
 * like the full create form's defaults.
 */
export function PractiseNowButton({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const [format] = useBattleFormat();
  const [open, setOpen] = useState(false);
  const createRequest = useCreateBattleRequest(client);

  async function post() {
    try {
      await createRequest.mutateAsync(
        buildPractiseRequest({
          now: new Date(),
          format,
          language: getLocale() === "ja" ? "ja" : "en",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          rules: t("battles.practiseRules"),
        }),
      );
      toast.success(t("battles.createdToast"));
      setOpen(false);
    } catch (mutationError) {
      const message = (mutationError as { message?: string } | null)?.message;
      toast.error(createErrorMessage(message, t));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className={buttonSmTouchClass}>
          <ZapIcon aria-hidden />
          {t("battles.practiseNow")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("battles.practiseNowTitle")}</DialogTitle>
          <DialogDescription>
            {t("battles.practiseNowDescription", {
              format: t(
                format === "doubles"
                  ? "battles.formatDoubles"
                  : "battles.formatSingles",
              ),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className={buttonTouchClass}
            onClick={() => setOpen(false)}
            disabled={createRequest.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className={buttonTouchClass}
            onClick={() => void post()}
            loading={createRequest.isPending}
            disabled={createRequest.isPending}
          >
            {t("battles.practiseNowConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
