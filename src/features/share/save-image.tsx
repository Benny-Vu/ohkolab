import { useState } from "react";
import { DownloadIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { menuItemClass } from "@/components/menu-item-class";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n/t";
import type { ShareCardContent, ShareCardFormat } from "@/lib/share-cards/svg";

/** The two output formats, in menu order, with their labels. */
const FORMATS: readonly {
  format: ShareCardFormat;
  label: "share.imageStory" | "share.imageLandscape";
}[] = [
  { format: "1080x1920", label: "share.imageStory" },
  { format: "1200x630", label: "share.imageLandscape" },
];

/**
 * "Save as image" behaviour: the card module loads lazily on the first
 * save (fonts, sprites and the canvas flow stay out of every route chunk),
 * a toast confirms the download, and a failure never loses the click
 * silently. Re-clicks while a save is running are ignored.
 */
function useSaveImage(content: ShareCardContent) {
  const t = useT();
  const [pending, setPending] = useState(false);

  const save = async (format: ShareCardFormat): Promise<void> => {
    if (pending) return;
    setPending(true);
    try {
      const { saveShareCard } = await import("@/lib/share-cards/save");
      await saveShareCard(content, format);
      toast.success(t("share.imageSaved"));
    } catch {
      toast.error(t("share.imageSaveFailed"));
    } finally {
      setPending(false);
    }
  };

  return { pending, save };
}

/** The localized label of one output format. */
function formatLabel(
  t: ReturnType<typeof useT>,
  label: "share.imageStory" | "share.imageLandscape",
): string {
  return t(label);
}

/**
 * A "Save as image" button with a two-item format menu (story and
 * landscape), following the ShareButton's placement on the team and calc
 * surfaces. `iconOnly` fits it next to the row actions of a calc result.
 */
export function SaveImageButton({
  content,
  size = "sm",
  variant = "outline",
  iconOnly = false,
  className,
}: {
  content: ShareCardContent;
  size?: "xs" | "sm" | "default";
  variant?: "default" | "outline" | "ghost" | "secondary";
  iconOnly?: boolean;
  className?: string;
}) {
  const t = useT();
  const { pending, save } = useSaveImage(content);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={iconOnly ? t("share.saveImage") : undefined}
          className={className}
          disabled={pending}
          size={iconOnly ? "icon-xs" : size}
          variant={variant}
        >
          {pending ? (
            <LoaderCircleIcon aria-hidden className="animate-spin" />
          ) : (
            <DownloadIcon aria-hidden />
          )}
          {iconOnly ? null : t("share.saveImage")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {FORMATS.map(({ format, label }) => (
          <DropdownMenuItem
            key={format}
            className={menuItemClass}
            onSelect={() => void save(format)}
          >
            {formatLabel(t, label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The format picker as a small dialog, for surfaces where the "Save as
 * image" action sits inside a dropdown menu (the post card's overflow
 * menu): the menu item selects, and the caller renders this dialog next to
 * the menu — not inside it, because the menu's content unmounts when the
 * item closes it. A submenu would be the alternative, but its menu
 * primitives are not used anywhere else and would grow the entry chunk
 * (see the entry-size budget).
 */
export function SaveImageDialog({
  content,
  open,
  onOpenChange,
}: {
  content: ShareCardContent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { pending, save } = useSaveImage(content);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("share.saveImage")}</DialogTitle>
          <DialogDescription>
            {t("share.imageFormatDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {FORMATS.map(({ format, label }, index) => (
            <Button
              disabled={pending}
              key={format}
              onClick={() => {
                onOpenChange(false);
                void save(format);
              }}
              variant={index === 0 ? "default" : "outline"}
            >
              {formatLabel(t, label)}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
