// Probe entry WITHOUT the display-names usage: the baseline the other
// probe entry is compared against. Top-level side effects keep it intact.
import { getLearnableMoves, listSpecies } from "@/data";

const first = listSpecies()[0]?.id ?? "garchomp";
console.log(first, getLearnableMoves(first));
