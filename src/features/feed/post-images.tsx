import { useState } from "react";
import { Link } from "react-router";
import { LoaderCircleIcon, ShieldOffIcon } from "lucide-react";

import { useT } from "@/lib/i18n/t";
import type { PostImageDisplay } from "@/lib/social/images";
import { ImageLightbox } from "@/features/feed/image-lightbox";

interface PostImageGridProps {
  /** Already filtered per viewer by `visiblePostImages`. */
  images: PostImageDisplay[];
  className?: string;
}

/**
 * The images of one post: approved images in a 1/2/2×2 grid that opens a
 * lightbox on tap, plus the author-only status notices ("Checking image…",
 * "Image removed by automatic screening") underneath. Phone first: the grid
 * is 2 columns at every width; a single image spans the full card.
 */
export function PostImageGrid({ images, className }: PostImageGridProps) {
  const t = useT();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const approved = images.filter((image) => image.status === "approved");
  const notices = images.filter((image) => image.status !== "approved");
  if (approved.length === 0 && notices.length === 0) {
    return null;
  }

  const single = approved.length === 1;

  return (
    <div className={className}>
      {approved.length > 0 && (
        <ul
          className={
            single ? "grid grid-cols-1" : "grid grid-cols-2 gap-1 sm:gap-1.5"
          }
          aria-label={t("postImages.gridLabel")}
        >
          {approved.map((image, index) => (
            <li key={image.id} className={single ? undefined : "aspect-square"}>
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={t("postImages.open", { n: index + 1 })}
                className="block size-full cursor-zoom-in overflow-hidden rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <img
                  src={image.url ?? undefined}
                  alt={image.alt ?? t("composer.imageAlt", { n: index + 1 })}
                  loading="lazy"
                  className={
                    single
                      ? "max-h-80 w-full rounded-md object-cover sm:max-h-96"
                      : "size-full object-cover"
                  }
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {notices.length > 0 && (
        <ul
          className={approved.length > 0 ? "mt-2 grid gap-1.5" : "grid gap-1.5"}
        >
          {notices.map((image) => (
            <li
              key={image.id}
              className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
            >
              {image.status === "pending" ? (
                <>
                  <LoaderCircleIcon
                    className="size-3.5 shrink-0 animate-spin"
                    aria-hidden
                  />
                  {t("postImages.checking")}
                </>
              ) : (
                <>
                  <ShieldOffIcon className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    {t("postImages.removed")}{" "}
                    <Link
                      to="/notifications"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t("postImages.seeNotice")}
                    </Link>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {openIndex !== null && approved[openIndex] && (
        <ImageLightbox
          image={approved[openIndex]}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
