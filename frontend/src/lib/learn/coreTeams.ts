import {
  ALL_NATURES,
  canonicalSpeciesId,
  emptyTeamMember,
  type Format,
  type Nature,
  type Pokemon,
  type PokemonUsage,
  type Team,
  type TeamMember,
} from "../types";
import { statPointsToEvs } from "../champions";

const MIN_CORE_MEMBERS = 3;

function score(id: string, usage: PokemonUsage, pokemon: Pokemon): number {
  const types = pokemon.types.map((type) => type.toLowerCase());
  const abilities = usage.top_abilities.map((entry) => entry.name.toLowerCase());
  const moves = usage.top_moves.map((entry) => entry.name.toLowerCase());
  const speed = pokemon.base_stats.spe;
  const bulk = pokemon.base_stats.hp + pokemon.base_stats.def + pokemon.base_stats.spd;
  const offense = Math.max(pokemon.base_stats.atk, pokemon.base_stats.spa);
  let value = usage.usage_percent * 0.1 + usage.sources_covering * 3;

  if (id === "sun") {
    if (types.includes("fire")) value += 25;
    if (abilities.some((entry) => /drought|solar power/.test(entry))) value += 25;
    if (moves.some((entry) => /sunny day/.test(entry))) value += 15;
  } else if (id === "rain") {
    if (types.includes("water")) value += 25;
    if (abilities.some((entry) => /drizzle|swift swim|rain dish/.test(entry))) value += 25;
    if (moves.some((entry) => /rain dance/.test(entry))) value += 15;
  } else if (id === "sand") {
    if (types.some((type) => ["rock", "ground", "steel"].includes(type))) value += 15;
    if (abilities.some((entry) => /sand stream|sand rush|sand force/.test(entry))) value += 25;
  } else if (id === "snow") {
    if (types.includes("ice")) value += 25;
    if (abilities.some((entry) => /snow warning|slush rush/.test(entry))) value += 25;
  } else if (id === "trick_room") {
    if (speed <= 50) value += 25;
    if (moves.some((entry) => /trick room/.test(entry))) value += 30;
  } else if (id === "tailwind") {
    if (moves.some((entry) => /tailwind/.test(entry))) value += 35;
    if (speed >= 100) value += 10;
  } else if (id === "terrain") {
    if (abilities.some((entry) => /surge/.test(entry))) value += 30;
    if (moves.some((entry) => /terrain/.test(entry))) value += 25;
  } else if (id === "fake_out") {
    if (moves.some((entry) => /fake out/.test(entry))) value += 35;
    if (moves.some((entry) => /follow me|rage powder/.test(entry))) value += 30;
  } else if (id === "bulky_offense") {
    if (bulk >= 250) value += 20;
    if (speed <= 80) value += 8;
  } else if (id === "hyper_offense") {
    if (offense >= 110) value += 15;
    if (speed >= 100) value += 15;
  } else if (id === "balance") {
    if (bulk >= 220) value += 8;
    if (usage.top_items.length > 0) value += 4;
  }
  return value;
}

function natureFor(usage: PokemonUsage): Nature | null {
  const raw = usage.top_natures?.[0]?.name?.toLowerCase();
  if (!raw) return null;
  return ALL_NATURES.find((nature) => nature.toLowerCase() === raw) ?? null;
}

function memberFor(usage: PokemonUsage, pokemon: Pokemon): TeamMember {
  const physical = pokemon.base_stats.atk >= pokemon.base_stats.spa;
  const points = {
    hp: 2,
    atk: physical ? 32 : 0,
    def: 0,
    spa: physical ? 0 : 32,
    spd: 0,
    spe: 32,
  };
  const moves = usage.common_movesets?.[0]?.moves?.length
    ? usage.common_movesets[0].moves
    : usage.top_moves.map((entry) => entry.name);
  return {
    ...emptyTeamMember(),
    species: usage.species,
    item: usage.top_items?.[0]?.name ?? null,
    ability: usage.top_abilities?.[0]?.name ?? null,
    nature: natureFor(usage),
    moves: [...new Set(moves)].slice(0, 4),
    stat_points: points,
    evs: statPointsToEvs(points),
  };
}

/**
 * Build a starter team from real meta species for an archetype. It never
 * invents species: if the current meta does not have at least three matching
 * entries, the card disables "Try core".
 */
export function buildArchetypeTeam(
  archetypeId: string,
  archetypeName: string,
  format: Format,
  meta: PokemonUsage[],
  pokedex: Pokemon[],
): Team | null {
  const bySpecies = new Map(
    pokedex.map((pokemon) => [canonicalSpeciesId(pokemon.name), pokemon]),
  );
  const candidates = meta
    .map((usage) => ({
      usage,
      pokemon: bySpecies.get(canonicalSpeciesId(usage.species)),
    }))
    .filter((entry): entry is { usage: PokemonUsage; pokemon: Pokemon } =>
      Boolean(entry.pokemon),
    )
    .map((entry) => ({
      ...entry,
      score: score(archetypeId, entry.usage, entry.pokemon!),
    }))
    .sort((a, b) => b.score - a.score || b.usage.count - a.usage.count);
  const selected: TeamMember[] = [];
  const seen = new Set<string>();
  for (const entry of candidates) {
    if (selected.length >= 6) break;
    const id = canonicalSpeciesId(entry.usage.species);
    if (seen.has(id)) continue;
    seen.add(id);
    selected.push(memberFor(entry.usage, entry.pokemon));
  }
  if (selected.length < MIN_CORE_MEMBERS) return null;
  const members = Array.from({ length: 6 }, (_, index) =>
    selected[index] ?? emptyTeamMember(),
  );
  return {
    id: null,
    name: `Core: ${archetypeName}`,
    format,
    build_mode: "champions",
    notes: null,
    members,
    created_at: null,
    updated_at: null,
  };
}
