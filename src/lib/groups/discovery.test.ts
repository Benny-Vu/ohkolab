import { describe, expect, it } from "vitest";

import type { DiscoverGroup } from "@/lib/groups/queries";
import {
  filterDiscoverGroups,
  sortDiscoverGroups,
  type DiscoverFilters,
} from "@/lib/groups/discovery";
import type { GroupCategory, GroupLanguage } from "@/lib/groups/validation";

function discoverGroup(
  partial: Partial<DiscoverGroup> & { id: string },
): DiscoverGroup {
  return {
    slug: partial.id,
    name: "Group",
    description: null,
    visibility: "public",
    category: null,
    language: null,
    ownerId: "user-1",
    createdAt: "2026-11-01T10:00:00.000Z",
    memberCount: 1,
    ...partial,
  };
}

const NO_FILTERS: DiscoverFilters = {
  search: "",
  category: null,
  language: null,
};

describe("filterDiscoverGroups", () => {
  const groups = [
    discoverGroup({
      id: "g1",
      slug: "doubles-lab",
      name: "Doubles Lab",
      category: "doubles",
      language: "en",
    }),
    discoverGroup({
      id: "g2",
      slug: "kanto-club",
      name: "Kanto Club",
      category: "regional",
      language: "ja",
    }),
    discoverGroup({ id: "g3", slug: "team-help", name: "Team Help" }),
  ];

  it("returns everything with no filters", () => {
    expect(filterDiscoverGroups(groups, NO_FILTERS)).toHaveLength(3);
  });

  it("searches names, case-insensitively", () => {
    const filtered = filterDiscoverGroups(groups, {
      ...NO_FILTERS,
      search: "DOUBLES",
    });
    expect(filtered.map((group) => group.id)).toEqual(["g1"]);
  });

  it("filters by category", () => {
    const filtered = filterDiscoverGroups(groups, {
      ...NO_FILTERS,
      category: "regional" as GroupCategory,
    });
    expect(filtered.map((group) => group.id)).toEqual(["g2"]);
  });

  it("filters by language", () => {
    const filtered = filterDiscoverGroups(groups, {
      ...NO_FILTERS,
      language: "ja" as GroupLanguage,
    });
    expect(filtered.map((group) => group.id)).toEqual(["g2"]);
  });

  it("search matches the slug when the name does not", () => {
    const filtered = filterDiscoverGroups(groups, {
      ...NO_FILTERS,
      search: "KANTO",
    });
    expect(filtered.map((group) => group.id)).toEqual(["g2"]);
  });

  it("combines search, category and language", () => {
    const filtered = filterDiscoverGroups(groups, {
      search: "lab",
      category: "doubles",
      language: "en",
    });
    expect(filtered.map((group) => group.id)).toEqual(["g1"]);
  });

  it("returns nothing when the filters exclude every group", () => {
    const filtered = filterDiscoverGroups(groups, {
      ...NO_FILTERS,
      search: "zzz",
    });
    expect(filtered).toEqual([]);
  });
});

describe("sortDiscoverGroups", () => {
  const groups = [
    discoverGroup({
      id: "small",
      name: "Alpha",
      memberCount: 2,
      createdAt: "2026-11-01T10:00:00.000Z",
    }),
    discoverGroup({
      id: "big",
      name: "Zeta",
      memberCount: 9,
      createdAt: "2026-11-02T10:00:00.000Z",
    }),
    discoverGroup({
      id: "fresh",
      name: "Mid",
      memberCount: 2,
      createdAt: "2026-11-03T10:00:00.000Z",
    }),
  ];

  it("sorts by member count for Popular, ties by name", () => {
    expect(
      sortDiscoverGroups(groups, "popular").map((group) => group.id),
    ).toEqual(["big", "small", "fresh"]);
  });

  it("sorts by creation date for New, ties by name", () => {
    expect(sortDiscoverGroups(groups, "new").map((group) => group.id)).toEqual([
      "fresh",
      "big",
      "small",
    ]);
  });

  it("does not mutate the input list", () => {
    const input = [...groups];
    sortDiscoverGroups(groups, "popular");
    expect(groups.map((group) => group.id)).toEqual(
      input.map((group) => group.id),
    );
  });
});
