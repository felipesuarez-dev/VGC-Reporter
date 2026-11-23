import { describe, expect, it } from "vitest";
import type { Pokemon, PokemonUsage } from "../types";
import { buildArchetypeTeam } from "./coreTeams";

function pokemon(name: string, types: Pokemon["types"], spe: number, atk = 100, spa = 80): Pokemon {
  return {
    id: name.toLowerCase(),
    name,
    num: 1,
    types,
    base_stats: { hp: 80, atk, def: 80, spa, spd: 80, spe },
    abilities: [],
    sprite_url: "",
    sprite_fallback_url: null,
    home_sprite_url: null,
  };
}

function usage(species: string, moves: string[], ability = "Pressure"): PokemonUsage {
  return {
    species,
    usage_percent: 20,
    count: 100,
    top_items: [{ name: "Safety Goggles", usage_percent: 40, count: 40 }],
    top_moves: moves.map((name) => ({ name, usage_percent: 50, count: 50 })),
    top_abilities: [{ name: ability, usage_percent: 80, count: 80 }],
    top_tera: [],
    top_teammates: [],
    top_natures: [{ name: "Adamant", usage_percent: 50, count: 50 }],
    common_movesets: [],
    sprite_url: "",
    sprite_fallback_url: null,
    home_sprite_url: null,
    win_rate: 55,
    top_cut_rate: 20,
    meta_score: 1,
    tier: null,
    sources_covering: 2,
  };
}

const dex = [
  pokemon("Solar", ["Fire"], 80),
  pokemon("Drought", ["Fire"], 60),
  pokemon("Slow", ["Psychic"], 30, 60, 110),
  pokemon("Fast", ["Flying"], 120),
];
const meta = [
  usage("Solar", ["Flamethrower"]),
  usage("Drought", ["Sunny Day"], "Drought"),
  usage("Slow", ["Trick Room"]),
  usage("Fast", ["Tailwind"]),
];

describe("core team builder", () => {
  it("uses real meta species and fills the team", () => {
    const team = buildArchetypeTeam("sun", "Sol", "regulation-m-c", meta, dex);
    expect(team).not.toBeNull();
    expect(team!.members.filter((member) => member.species).length).toBe(4);
    expect(team!.members[0].species).toBe("Drought");
  });

  it("explains it cannot build a core with fewer than three usable species", () => {
    const team = buildArchetypeTeam(
      "sun",
      "Sol",
      "regulation-m-c",
      [meta[0]],
      [dex[0]],
    );
    expect(team).toBeNull();
  });
});
