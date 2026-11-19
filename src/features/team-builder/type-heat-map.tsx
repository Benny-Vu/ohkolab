import {
  abilityMatchupNotes,
  attackingTypes,
  coverageGaps,
  defensiveOverview,
  memberLabel,
  type AbilityMatchupNote,
} from "@/lib/team";
import { typeEffectiveness } from "@/data";
import { useDisplayName } from "@/data/display-names";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { TYPE_COLORS } from "@/lib/type-colors";
import { TYPE_NAMES, type PokemonSet, type TypeName } from "@/types/pokemon";

const TYPE_ABBREVIATIONS: Record<TypeName, string> = {
  Normal: "Nor",
  Fire: "Fir",
  Water: "Wat",
  Electric: "Ele",
  Grass: "Gra",
  Ice: "Ice",
  Fighting: "Fig",
  Poison: "Poi",
  Ground: "Gro",
  Flying: "Fly",
  Psychic: "Psy",
  Bug: "Bug",
  Rock: "Roc",
  Ghost: "Gho",
  Dragon: "Dra",
  Dark: "Dar",
  Steel: "Ste",
  Fairy: "Fai",
};

/** An attacking type three or more members are weak to. */
const SHARED_WEAKNESS_THRESHOLD = 3;

type HeatMapMode = "defense" | "offense";

interface HeatMapRow {
  key: string;
  label: string;
  cells: (number | null)[];
}

interface TypeHeatMapProps {
  members: PokemonSet[];
  mode: HeatMapMode;
}

function defenseRows(members: PokemonSet[]): HeatMapRow[] {
  const overview = defensiveOverview(members);
  return members.map((member, memberIndex) => ({
    key: `${member.species}-${memberIndex}`,
    label: memberLabel(member),
    cells: overview.map((entry) => entry.multipliers[memberIndex] ?? null),
  }));
}

function offenseRows(members: PokemonSet[]): HeatMapRow[] {
  return attackingTypes(members).map((moveType) => ({
    key: moveType,
    label: moveType,
    cells: TYPE_NAMES.map((defending) =>
      typeEffectiveness(moveType, [defending]),
    ),
  }));
}

function formatMultiplier(multiplier: number | null): string {
  if (multiplier === null) return "—";
  if (multiplier === 0) return "0";
  if (multiplier === 0.25) return "¼";
  if (multiplier === 0.5) return "½";
  if (multiplier === 1) return "";
  return String(multiplier);
}

function cellTone(multiplier: number | null, mode: HeatMapMode): string {
  if (multiplier === null || multiplier === 1) return "text-muted-foreground";
  if (mode === "defense") {
    if (multiplier > 1) return "font-medium text-destructive";
    if (multiplier === 0) return "text-muted-foreground";
    return "text-success";
  }
  if (multiplier >= 2) return "font-medium text-success";
  if (multiplier === 0) return "text-muted-foreground";
  return "text-destructive";
}

const ABILITY_NOTE_KEYS = {
  immune: "teams.abilityImmune",
  resist: "teams.abilityResist",
  weak: "teams.abilityVulnerable",
} as const;

export function TypeHeatMap({ members, mode }: TypeHeatMapProps) {
  const t = useT();
  const displayName = useDisplayName();
  const [locale] = useLocale();
  // The Japanese type names are short, so the columns show them whole; in
  // English the three-letter abbreviations keep the table narrow.
  const columnLabel = (type: TypeName) =>
    locale === "ja" ? displayName("type", type) : TYPE_ABBREVIATIONS[type];
  const rows = (
    mode === "defense" ? defenseRows(members) : offenseRows(members)
  ).map((row) => ({
    ...row,
    label:
      mode === "defense"
        ? displayName("species", row.label)
        : displayName("type", row.label),
  }));

  // Column highlights: defending against a shared weakness, or attacking
  // into an uncovered type.
  const highlighted = new Set<TypeName>();
  if (mode === "defense") {
    for (const entry of defensiveOverview(members)) {
      if (entry.weak >= SHARED_WEAKNESS_THRESHOLD) highlighted.add(entry.type);
    }
  } else {
    for (const gap of coverageGaps(members)) highlighted.add(gap.type);
  }

  // The matchups an ability changed, for cell tooltips and the footnote.
  const noteByKey = new Map<string, AbilityMatchupNote>();
  if (mode === "defense") {
    for (const note of abilityMatchupNotes(members)) {
      noteByKey.set(`${note.member}-${note.type}`, note);
    }
  }
  const noteSentence = (note: AbilityMatchupNote): string =>
    t(ABILITY_NOTE_KEYS[note.effect], {
      pokemon: displayName("species", memberLabel(members[note.member]!)),
      ability: displayName("ability", note.ability),
      type: displayName("type", note.type),
    });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("teams.noDamagingMoves")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 border-b border-border bg-card pr-2 text-left text-[10px] font-medium text-muted-foreground"
              >
                {mode === "defense"
                  ? t("teams.heatMapPokemon")
                  : t("teams.heatMapMoveType")}
              </th>
              {TYPE_NAMES.map((type) => (
                <th
                  key={type}
                  scope="col"
                  className="border-b border-border px-0.5 pb-1.5 text-center"
                >
                  <span
                    className={`inline-flex h-4 min-w-7 items-center justify-center rounded-[3px] px-1 text-[9px] font-semibold tracking-wide text-white uppercase ${
                      highlighted.has(type) ? "ring-2 ring-destructive" : ""
                    }`}
                    style={{ backgroundColor: TYPE_COLORS[type] }}
                  >
                    {columnLabel(type)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card pr-2 text-left font-normal"
                >
                  <span className="block max-w-24 truncate text-muted-foreground">
                    {row.label}
                  </span>
                </th>
                {row.cells.map((cell, index) => {
                  const type = TYPE_NAMES[index]!;
                  // In defense mode the rows follow team order, so the row
                  // index is the member index the note is keyed by.
                  const note =
                    mode === "defense"
                      ? noteByKey.get(`${rowIndex}-${type}`)
                      : undefined;
                  return (
                    <td
                      key={index}
                      title={note ? noteSentence(note) : undefined}
                      className={`px-0.5 py-1 text-center font-mono text-[10px] tabular-nums ${cellTone(cell, mode)}`}
                    >
                      {formatMultiplier(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mode === "defense" && noteByKey.size > 0 && (
        <ul className="flex flex-col gap-0.5">
          {[...noteByKey.values()].map((note) => (
            <li
              key={`${note.member}-${note.type}`}
              className="text-[11px] text-muted-foreground"
            >
              {noteSentence(note)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
