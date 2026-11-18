import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PostImageDisplay } from "@/lib/social/images";

interface ImageLightboxProps {
  image: PostImageDisplay;
  onClose: () => void;
}

/**
 * Full-screen viewer for one post image: the image as large as it fits, the
 * alt text as the caption when present. Closes on Escape, on the backdrop
 * and on a tap or click on the image itself.
 */
export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className="top-auto bottom-auto translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-3xl max-sm:inset-4 max-sm:rounded-lg max-sm:border-0"
      >
        <DialogTitle className="sr-only">Image</DialogTitle>
        <button
          type="button"
          aria-label="Close image"
          onClick={onClose}
          className="block w-full cursor-zoom-out"
        >
          <img
            src={image.url ?? undefined}
            alt={image.alt ?? "Post image"}
            className="max-h-[75vh] w-full object-contain"
          />
        </button>
        {image.alt && (
          <DialogDescription className="px-4 py-3">
            {image.alt}
          </DialogDescription>
        )}
      </DialogContent>
    </Dialog>
  );
}
