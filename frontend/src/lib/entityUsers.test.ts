import { describe, expect, it } from "vitest";
import { buildEntityUsers } from "./entityUsers";
import type { PokemonUsage } from "./types";

function usage(species: string, item: string, percent: number): PokemonUsage {
  return {
    species,
    usage_percent: 10,
    count: 1,
    top_items: [{ name: item, usage_percent: percent }],
    top_moves: [{ name: "Protect", usage_percent: percent }],
    top_abilities: [{ name: "Intimidate", usage_percent: percent }],
    top_tera: [],
    top_teammates: [],
    top_natures: [],
    common_movesets: [],
    sprite_url: `${species}.png`,
    sprite_fallback_url: null,
    home_sprite_url: null,
    win_rate: null,
  } as unknown as PokemonUsage;
}

describe("buildEntityUsers", () => {
  it("inverts per-Pokémon usage and keeps the highest adoption", () => {
    const users = buildEntityUsers(
      [
        usage("Incineroar", "Safety Goggles", 12),
        usage("Sneasler", "Safety Goggles", 64),
        usage("Rillaboom", "Safety Goggles", 30),
        usage("Rillaboom", "Assault Vest", 55),
      ],
      "top_items",
    );
    const goggles = users.get("safetygoggles") ?? [];
    expect(goggles.map((user) => user.species)).toEqual([
      "Sneasler",
      "Rillaboom",
      "Incineroar",
    ]);
    expect(goggles[0].usagePercent).toBe(64);
  });

  it("ignores impossible adoption percentages from mirror rows", () => {
    const users = buildEntityUsers(
      [usage("Charizard Mega Y", "Charizardite Y", 39992.87)],
      "top_items",
    );
    expect(users.get("charizarditey")).toBeUndefined();
  });

  it("builds move and ability maps and respects the limit", () => {
    const pokemon = [
      usage("A", "Leftovers", 50),
      usage("B", "Leftovers", 40),
      usage("C", "Leftovers", 30),
      usage("D", "Leftovers", 20),
    ];
    expect(buildEntityUsers(pokemon, "top_items", 2).get("leftovers")).toHaveLength(2);
    expect(buildEntityUsers(pokemon, "top_moves", 2).get("protect")).toHaveLength(2);
    expect(
      buildEntityUsers(pokemon, "top_abilities", 2).get("intimidate"),
    ).toHaveLength(2);
  });
});
