import { Dex, gen, toID } from "@/data/gen";

export interface ItemInfo {
  name: string;
  id: string;
  isBerry: boolean;
  /** For a Mega Stone: the species that can use it. Otherwise null. */
  megaStoneFor: string[] | null;
  shortDesc: string;
}

let cache: { list: ItemInfo[]; byId: Map<string, ItemInfo> } | undefined;

function build() {
  const list: ItemInfo[] = [];
  for (const item of gen.items) {
    const dex = Dex.items.get(item.name);
    list.push({
      name: item.name,
      id: item.id,
      isBerry: Boolean(item.isBerry) || item.name.endsWith(" Berry"),
      megaStoneFor: item.megaStone ? Object.keys(item.megaStone) : null,
      shortDesc: dex.exists ? dex.shortDesc : "",
    });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return { list, byId: new Map(list.map((info) => [info.id, info])) };
}

function data() {
  cache ??= build();
  return cache;
}

/** Every held item available in Champions, sorted by name. */
export function listItems(): readonly ItemInfo[] {
  return data().list;
}

/** Items a given species can usefully hold: all regular items plus its own Mega Stones. */
export function listItemsFor(species: string): readonly ItemInfo[] {
  return data().list.filter(
    (item) => item.megaStoneFor === null || item.megaStoneFor.includes(species),
  );
}

/** Looks an item up by name or id, case-insensitively. */
export function getItem(name: string): ItemInfo | undefined {
  return data().byId.get(toID(name));
}
