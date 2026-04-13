/**
 * Hand-maintained mirror of the Rust domain types. Kept in sync with
 * src-tauri/src/domain/*.rs. When adding a new field, update both places.
 *
 * ts-rs is configured to also export a generated file at types.generated.ts
 * once `cargo test` runs in CI; these types are the authoritative surface the
 * rest of the frontend depends on and can be re-exported from there once
 * generated.
 */

export type Format =
  | "regulation-m-a"
  | "champions-singles"
  | "regulation-i"
  | "gen9-ou";

export const ALL_FORMATS: { value: Format; label: string }[] = [
  { value: "regulation-m-a", label: "Regulation M-A (Champions doubles)" },
  { value: "champions-singles", label: "Champions Singles" },
  { value: "regulation-i", label: "Regulation I (doubles, active)" },
  { value: "gen9-ou", label: "Gen 9 OU (singles)" },
];

export type PokemonType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Electric"
  | "Grass"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon"
  | "Dark"
  | "Steel"
  | "Fairy"
  | "Stellar";

export const ALL_TYPES: PokemonType[] = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting",
  "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost",
  "Dragon", "Dark", "Steel", "Fairy", "Stellar",
];

export type Nature =
  | "Hardy" | "Lonely" | "Brave" | "Adamant" | "Naughty"
  | "Bold"  | "Docile" | "Relaxed"| "Impish" | "Lax"
  | "Timid" | "Hasty"  | "Serious"| "Jolly"  | "Naive"
  | "Modest"| "Mild"   | "Quiet"  | "Bashful"| "Rash"
  | "Calm"  | "Gentle" | "Sassy"  | "Careful"| "Quirky";

export const ALL_NATURES: Nature[] = [
  "Hardy","Lonely","Brave","Adamant","Naughty","Bold","Docile","Relaxed",
  "Impish","Lax","Timid","Hasty","Serious","Jolly","Naive","Modest","Mild",
  "Quiet","Bashful","Rash","Calm","Gentle","Sassy","Careful","Quirky",
];

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface EvSpread {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface Pokemon {
  id: string;
  name: string;
  num: number;
  types: PokemonType[];
  base_stats: Stats;
  abilities: string[];
  sprite_url: string;
  sprite_fallback_url: string | null;
}

export function generationOf(num: number): number {
  if (num >= 1 && num <= 151) return 1;
  if (num <= 251) return 2;
  if (num <= 386) return 3;
  if (num <= 493) return 4;
  if (num <= 649) return 5;
  if (num <= 721) return 6;
  if (num <= 809) return 7;
  if (num <= 905) return 8;
  if (num <= 1025) return 9;
  return 0;
}

export interface TeamMember {
  species: string;
  item: string | null;
  ability: string | null;
  nature: Nature | null;
  tera_type: PokemonType | null;
  moves: string[];
  evs: EvSpread;
}

export interface Team {
  id: number | null;
  name: string;
  format: Format;
  notes: string | null;
  members: TeamMember[];
  created_at: string | null;
  updated_at: string | null;
}

export interface UsageEntry {
  name: string;
  usage_percent: number;
  count: number;
}

export interface PokemonUsage {
  species: string;
  usage_percent: number;
  count: number;
  top_items: UsageEntry[];
  top_moves: UsageEntry[];
  top_abilities: UsageEntry[];
  top_tera: UsageEntry[];
  top_teammates: UsageEntry[];
  sprite_url: string;
}

export interface MetaSnapshot {
  format: Format;
  generated_at: string;
  source: string;
  tournaments_used: number;
  total_entries: number;
  pokemon: PokemonUsage[];
  top_items: UsageEntry[];
  top_moves: UsageEntry[];
  top_abilities: UsageEntry[];
  top_tera: UsageEntry[];
}

export interface ChampionsTournament {
  id: string;
  name: string;
  date: string | null;
  players: number | null;
  format: string | null;
  organizer_id: string | null;
}

export interface ChampionsReport {
  tournaments: ChampionsTournament[];
  fetched_at: string;
}

export interface DecklistPokemon {
  id: string | null;
  name: string;
  item: string | null;
  ability: string | null;
  tera_type: string | null;
  moves: string[];
  sprite_url: string;
  sprite_fallback_url: string | null;
}

export interface TournamentStanding {
  placing: number | null;
  player_name: string | null;
  player_id: string | null;
  country: string | null;
  record: string | null;
  wins: number;
  losses: number;
  ties: number;
  decklist: DecklistPokemon[];
}

export interface PokemonSet {
  name: string;
  item: string | null;
  ability: string | null;
  nature: string | null;
  tera_types: string[];
  evs: EvSpread;
  moves: string[];
}

export interface SetsBundle {
  species: string;
  doubles: PokemonSet[];
  singles: PokemonSet[];
  doubles_source: string | null;
  singles_source: string | null;
}

export interface TopTeamMember {
  species: string;
  sprite_url: string;
  item: string | null;
  tera_type: string | null;
}

export interface TopTeam {
  tournament: string;
  placing: number | null;
  player: string | null;
  record: string | null;
  members: TopTeamMember[];
}

export function emptyTeamMember(species = ""): TeamMember {
  return {
    species,
    item: null,
    ability: null,
    nature: null,
    tera_type: null,
    moves: [],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  };
}

export function emptyTeam(format: Format = "regulation-m-a"): Team {
  return {
    id: null,
    name: "",
    format,
    notes: null,
    members: Array.from({ length: 6 }, () => emptyTeamMember()),
    created_at: null,
    updated_at: null,
  };
}
