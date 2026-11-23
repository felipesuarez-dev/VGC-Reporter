import type { Nature } from "./types";

export type NatureStat = "atk" | "def" | "spa" | "spd" | "spe";

export interface NatureEffect {
  nature: Nature;
  up: NatureStat | null;
  down: NatureStat | null;
}

/** All 25 natures: five neutral and four per boosted stat. */
export const NATURE_EFFECTS: NatureEffect[] = [
  { nature: "Hardy", up: null, down: null },
  { nature: "Lonely", up: "atk", down: "def" },
  { nature: "Brave", up: "atk", down: "spe" },
  { nature: "Adamant", up: "atk", down: "spa" },
  { nature: "Naughty", up: "atk", down: "spd" },
  { nature: "Bold", up: "def", down: "atk" },
  { nature: "Docile", up: null, down: null },
  { nature: "Relaxed", up: "def", down: "spe" },
  { nature: "Impish", up: "def", down: "spa" },
  { nature: "Lax", up: "def", down: "spd" },
  { nature: "Timid", up: "spe", down: "atk" },
  { nature: "Hasty", up: "spe", down: "def" },
  { nature: "Serious", up: null, down: null },
  { nature: "Jolly", up: "spe", down: "spa" },
  { nature: "Naive", up: "spe", down: "spd" },
  { nature: "Modest", up: "spa", down: "atk" },
  { nature: "Mild", up: "spa", down: "def" },
  { nature: "Quiet", up: "spa", down: "spe" },
  { nature: "Bashful", up: null, down: null },
  { nature: "Rash", up: "spa", down: "spd" },
  { nature: "Calm", up: "spd", down: "atk" },
  { nature: "Gentle", up: "spd", down: "def" },
  { nature: "Sassy", up: "spd", down: "spe" },
  { nature: "Careful", up: "spd", down: "spa" },
  { nature: "Quirky", up: null, down: null },
];

export const NATURE_BOOSTS: NatureStat[] = ["atk", "def", "spa", "spd", "spe"];

export function naturesForBoost(stat: NatureStat | "neutral"): NatureEffect[] {
  return NATURE_EFFECTS.filter((entry) =>
    stat === "neutral" ? entry.up === null : entry.up === stat,
  );
}

/** Natures that modify a stat in either direction (used by the grid filter). */
export function naturesForStat(stat: NatureStat): NatureEffect[] {
  return NATURE_EFFECTS.filter(
    (entry) => entry.up === stat || entry.down === stat,
  );
}
