import { useEffect, useState } from "react";

/**
 * The id of the anchor the reader is looking at, for the "In this section"
 * list: of the given ids, the last one whose element has scrolled past the
 * top band of the viewport (below the sticky header). Null before the first
 * one, or where IntersectionObserver is unavailable (tests, old browsers).
 */
export function useActiveAnchor(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const elements = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) visible.add(record.target.id);
          else visible.delete(record.target.id);
        }
        // The first entry in reading order that is inside the band wins.
        const first = elements.find((element) => visible.has(element.id));
        if (first) setActive(first.id);
      },
      // A band from just under the header to 60% down the screen.
      { rootMargin: "-80px 0px -40% 0px" },
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [key]);

  return active;
}
