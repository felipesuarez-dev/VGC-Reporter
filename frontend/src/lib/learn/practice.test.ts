import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import type { Pokemon, PokemonUsage } from "../types";
import { dailyPractice } from "./practice";

const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key) as unknown as TFunction;

function pokemon(name: string, spe: number, types: Pokemon["types"]): Pokemon {
  return {
    id: name.toLowerCase(),
    name,
    num: 1,
    types,
    base_stats: { hp: 80, atk: 100, def: 80, spa: 90, spd: 80, spe },
    abilities: [],
    sprite_url: "",
    sprite_fallback_url: null,
    home_sprite_url: null,
  };
}

function usage(species: string): PokemonUsage {
  return {
    species,
    usage_percent: 20,
    count: 100,
    top_items: [],
    top_moves: [],
    top_abilities: [],
    top_tera: [],
    top_teammates: [],
    top_natures: [],
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

const pokedex = [
  pokemon("Fast", 120, ["Flying"]),
  pokemon("Slow", 30, ["Psychic"]),
  pokemon("Fire", 80, ["Fire"]),
  pokemon("Grass", 60, ["Grass"]),
];
const meta = pokedex.map((entry) => usage(entry.name));

describe("daily practice", () => {
  it("builds ten deterministic questions with valid options", () => {
    const first = dailyPractice({ t, dateKey: "2026-11-22", meta, pokedex });
    const second = dailyPractice({ t, dateKey: "2026-11-22", meta, pokedex });
    expect(first).toHaveLength(10);
    expect(second.map((question) => question.prompt)).toEqual(
      first.map((question) => question.prompt),
    );
    for (const question of first) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.options.some((option) => option.value === question.correct)).toBe(
        true,
      );
      expect(question.explanation.length).toBeGreaterThan(5);
    }
  });

  it("changes the pool with the day", () => {
    const first = dailyPractice({ t, dateKey: "2026-11-22", meta, pokedex });
    const next = dailyPractice({ t, dateKey: "2026-11-23", meta, pokedex });
    expect(next.map((question) => question.prompt)).not.toEqual(
      first.map((question) => question.prompt),
    );
  });

  it("uses only real species for speed and lead questions", () => {
    const questions = dailyPractice({ t, dateKey: "2026-11-22", meta, pokedex });
    const names = new Set(pokedex.map((entry) => entry.name));
    for (const question of questions) {
      if (question.kind === "speed" || question.kind === "lead") {
        for (const option of question.options) {
          expect(names.has(option.value)).toBe(true);
        }
      }
    }
  });

  it("keeps stat point answers consistent with the EV conversion", () => {
    const questions = dailyPractice({ t, dateKey: "2026-11-22", meta, pokedex });
    const stat = questions.find((question) => question.kind === "stat_points");
    expect(stat).toBeDefined();
    expect(stat!.correct).toMatch(/^\d+$/);
    expect(stat!.options.some((option) => option.value === stat!.correct)).toBe(true);
  });
});
