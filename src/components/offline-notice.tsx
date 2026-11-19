import { WifiOff } from "lucide-react";

import { useT } from "@/lib/i18n/t";
import { useOnlineStatus } from "@/lib/native/use-online";
import { isNativeApp } from "@/lib/platform";

/**
 * "You're offline" bar for the native apps: a thin overlay pinned just
 * under the header while `navigator.onLine` is false. Hidden on the web
 * site and while online; it overlays the content, so nothing shifts when
 * it appears. Meant to be mounted inside the sticky header, which it
 * anchors to (`absolute top-full`).
 */
export function OfflineNotice() {
  const t = useT();
  const online = useOnlineStatus();

  if (online || !isNativeApp()) return null;

  return (
    <div
      role="status"
      className="absolute inset-x-0 top-full z-30 flex h-7 items-center justify-center gap-1.5 border-b bg-background/95 px-4 text-center text-xs text-muted-foreground backdrop-blur"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{t("shell.offlineNotice")}</span>
    </div>
  );
}
