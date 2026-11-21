import type { TypeName } from "@/types/pokemon";

/**
 * Small identifiers derived from a type's name: the deep-link anchor the
 * sidebar and the cards use, and the three-letter code the chart headers
 * show. Both are derived — never hand-listed.
 */

/** The deep-link anchor of a type on the Types page. */
export function typeAnchor(type: TypeName): string {
  return type.toLowerCase();
}

/** The short header code of a type: the first three letters, upper case. */
export function typeHeaderCode(type: TypeName): string {
  return type.slice(0, 3).toUpperCase();
}
