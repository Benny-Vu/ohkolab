import { Share2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/t";
import { useShare, type ShareTarget } from "@/features/share/share-link";

type ShareButtonProps = Omit<ShareTarget, "url"> & {
  /** The link that is shared or copied. */
  url: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "xs" | "sm" | "default";
  className?: string;
};

/**
 * A Share button: the native share sheet where the platform has one, a
 * clipboard copy with a toast everywhere else. Same behaviour on every
 * surface (calc results, teams, posts, profiles), no third-party scripts.
 */
export function ShareButton({
  title,
  text,
  url,
  variant = "outline",
  size = "sm",
  className,
}: ShareButtonProps) {
  const t = useT();
  const share = useShare();

  return (
    <Button
      className={className}
      onClick={() => void share({ title, text, url })}
      size={size}
      variant={variant}
    >
      <Share2Icon aria-hidden />
      {t("share.share")}
    </Button>
  );
}
