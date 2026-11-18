// Probe entry WITH the display-names usage: mirrors what the app does
// once the pickers call displayName/useDisplayName. Everything runs at
// the top level so the bundler cannot tree-shake it away.
import { getLearnableMoves, listSpecies } from "@/data";
import { displayName, loadJapaneseNames } from "@/data/display-names";

void loadJapaneseNames();
const first = listSpecies()[0]?.id ?? "garchomp";
console.log(displayName("species", first, "ja"), getLearnableMoves(first));
