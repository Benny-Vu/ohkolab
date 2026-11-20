/**
 * Menu rows: one clear hover and keyboard highlight in the design and
 * motion tokens (design-rules.md: hover/focus goes over the whole row).
 * The generated kit's default `focus:bg-accent` is invisible in dark mode,
 * where `--accent` equals `--popover`, so each menu lays the visible tint
 * on top at the call site; the generated kit itself stays untouched.
 * Radix focuses hovered items, so `focus:` also carries the highlight to
 * keyboard navigation. Destructive rows use `menuItemDestructiveClass`,
 * the same shape with the destructive tint instead of the lime.
 */
export const menuItemClass =
  "cursor-pointer transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-accent-brand-subtle focus:bg-accent-brand-subtle";

export const menuItemDestructiveClass =
  "cursor-pointer transition-colors duration-(--motion-fast) ease-(--motion-ease-out) hover:bg-destructive/10 dark:hover:bg-destructive/20";
