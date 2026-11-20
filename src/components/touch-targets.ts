/**
 * Phone hit areas — the design-rules.md "Touch targets" rule: on phones
 * (below `sm:`) every interactive element is at least 44px tall, or carries
 * a 44px hit area around a smaller visual. The generated kit in
 * src/components/ui is never edited, so call sites lay these classes on top
 * of the kit's compact sizes instead.
 *
 * - `*HitClass`: an invisible inset-negative `after` pseudo-element grows the
 *   hit area to 44px while the visual stays compact — for dense rows
 *   (notification rows, offer rows) whose rhythm must not change.
 * - `buttonTouchClass`/`buttonSmTouchClass`: grow the visible button to 44px
 *   on phones only — for standalone and form actions where a taller button
 *   helps the thumb.
 */

/** `size="icon"` (32px visual) with a 44px hit area. */
export const iconHitClass =
  "relative after:absolute after:-inset-1.5 after:content-['']";

/** `size="icon-sm"` (28px visual) with a 44px hit area. */
export const iconHitSmClass =
  "relative after:absolute after:-inset-2 after:content-['']";

/** `size="icon-xs"` (24px visual) with a 44px hit area. */
export const iconHitXsClass =
  "relative after:absolute after:-inset-2.5 after:content-['']";

/**
 * `size="icon-xs"` buttons that sit directly next to each other (no gap):
 * the hit area grows tall but barely wide, so neighbours do not fight over
 * the pixels between them.
 */
export const adjacentIconHitXsClass =
  "relative after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']";

/** `size="icon-sm"` buttons packed with a `gap-1`: 44px tall hit area. */
export const adjacentIconHitSmClass =
  "relative after:absolute after:-inset-x-1 after:-inset-y-2 after:content-['']";

/** Dense-row small text buttons (`size="sm"`, 28px): 44px hit area. */
export const rowHitClass =
  "relative after:absolute after:-inset-x-1.5 after:-inset-y-2 after:content-['']";

/**
 * Inline text links (author names in rows): a 44px hit area without changing
 * the line. The element must not carry `truncate` itself — overflow hidden
 * clips the pseudo-element — so truncate an inner `<span>` instead.
 */
export const linkHitClass =
  "relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";

/** Dense-row extra-small text buttons (`size="xs"`): 44px hit area. */
export const rowHitXsClass =
  "relative after:absolute after:-inset-x-1.5 after:-inset-y-3 after:content-['']";

/** Standalone text buttons (`size="default"`/`lg`, 32/36px): 44px tall on phones. */
export const buttonTouchClass = "max-sm:h-11";

/** Small text buttons (`size="sm"`/`xs`, 28/24px): 44px tall on phones. */
export const buttonSmTouchClass = "max-sm:h-11 max-sm:px-3";

/**
 * Switches and checkboxes: the kit already widens their hit area with an
 * `after` pseudo-element (`-inset-y-2`), which lands at ~34/32px tall. This
 * pushes the inset to reach 44px on phones, keeping the visual unchanged.
 */
export const switchHitClass = "max-sm:after:-inset-y-3.5";
