import { useEffect, useState } from "react";
import { BellRingIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { CardTitle } from "@/components/card-title";
import { useT } from "@/lib/i18n/t";
import { isPushAvailable } from "@/lib/push/flag";
import { requestPermissionAndRegister } from "@/lib/push/notifications";
import { permissionStateOf, userStep } from "@/lib/push/permission";
import { getPushPlugin } from "@/lib/push/plugin";

/**
 * The "Turn on notifications" card, mounted lazily by the notifications
 * page. It appears only in the native app with VITE_PUSH on, only for a
 * signed-in user, and only while the OS permission is not granted: this is
 * the one place that asks for permission — nothing ever prompts on its own,
 * least of all the first launch. Once permission is granted (here or in the
 * device settings) the card is gone for good.
 */

type CardState = "checking" | "prompt" | "denied" | "granted";

export function PushPermissionCard() {
  const t = useT();
  const [state, setState] = useState<CardState>("checking");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isPushAvailable()) return;
    let cancelled = false;
    void getPushPlugin()
      .then(async (plugin) => {
        const { receive } = await plugin.checkPermissions();
        if (cancelled) return;
        const step = userStep(permissionStateOf(receive));
        setState(
          step === "request"
            ? "prompt"
            : step === "blocked"
              ? "denied"
              : "granted",
        );
      })
      .catch(() => {
        // Push is optional; a plugin failure just leaves the card hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isPushAvailable() || state === "checking" || state === "granted") {
    return null;
  }

  const handleTurnOn = async () => {
    setPending(true);
    try {
      const plugin = await getPushPlugin();
      const outcome = await requestPermissionAndRegister(plugin);
      if (outcome === "registered") {
        setState("granted");
        toast.success(t("notifications.pushOnToast"));
      } else {
        setState("denied");
      }
    } catch {
      toast.error(t("notifications.pushFailedToast"));
    } finally {
      setPending(false);
    }
  };

  if (state === "denied") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("notifications.pushDeniedTitle")}</CardTitle>
          <CardDescription>
            {t("notifications.pushDeniedDescription")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notifications.pushTitle")}</CardTitle>
        <CardDescription>{t("notifications.pushDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          onClick={() => void handleTurnOn()}
          disabled={pending}
        >
          <BellRingIcon aria-hidden />
          {t("notifications.pushTurnOn")}
        </Button>
      </CardContent>
    </Card>
  );
}
