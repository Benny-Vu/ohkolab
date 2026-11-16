import { Dex, gen, toID } from "@/data/gen";

export interface AbilityInfo {
  name: string;
  id: string;
  shortDesc: string;
}

let cache: { list: AbilityInfo[]; byId: Map<string, AbilityInfo> } | undefined;

function build() {
  const list: AbilityInfo[] = [];
  for (const ability of gen.abilities) {
    const dex = Dex.abilities.get(ability.name);
    list.push({
      name: ability.name,
      id: ability.id,
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

/** Every ability available in Champions, sorted by name. */
export function listAbilities(): readonly AbilityInfo[] {
  return data().list;
}

/** Looks an ability up by name or id, case-insensitively. */
export function getAbility(name: string): AbilityInfo | undefined {
  return data().byId.get(toID(name));
}
