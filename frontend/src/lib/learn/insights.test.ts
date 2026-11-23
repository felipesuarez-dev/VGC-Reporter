import { describe, expect, it } from "vitest";
import type { MetaSnapshot, PokemonUsage } from "../types";
import { computeMetaInsights, confidenceFor, MIN_INSIGHT_SAMPLE } from "./insights";

function usage(
  species: string,
  count: number,
  winRate: number | null,
  topCutRate: number | null,
  sources = 2,
  usagePercent = 10,
): PokemonUsage {
  return {
    species,
    usage_percent: usagePercent,
    count,
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
    win_rate: winRate,
    top_cut_rate: topCutRate,
    meta_score: null,
    tier: null,
    sources_covering: sources,
  };
}

const snapshot: MetaSnapshot = {
  format: "regulation-m-c",
  generated_at: "2026-11-22T00:00:00Z",
  source: "test",
  tournaments_used: 4,
  total_entries: 300,
  battles_analyzed: 900,
  pokemon: [
    usage("Tiny Sample", 2, 100, 100, 2, 1),
    usage("Large Sample", 120, 61, 38, 2, 30),
    usage("Low Usage Answer", 45, 57, 22, 1, 8),
  ],
  top_items: [{ name: "Safety Goggles", usage_percent: 42, count: 126 }],
  top_moves: [{ name: "Tailwind", usage_percent: 25, count: 75 }],
  top_abilities: [],
  top_tera: [],
  from_date: "2026-11-01",
  to_date: "2026-11-22",
  sources: [],
};

describe("Learn 2.0 insights", () => {
  it("never lets a two-team sample win the win-rate card", () => {
    const insights = computeMetaInsights(snapshot, undefined);
    expect(insights.bestWin?.name).toBe("Large Sample");
    expect(insights.bestWin?.sample).toBeGreaterThanOrEqual(MIN_INSIGHT_SAMPLE);
    expect(insights.bestTopCut?.name).toBe("Large Sample");
  });

  it("requires a real sample for the emerging threat", () => {
    const insights = computeMetaInsights(snapshot, {
      rising: [
        {
          species: "Tiny Sample",
          sprite_url: "",
          sprite_fallback_url: null,
          home_sprite_url: null,
          change_percentage: 50,
          day1_percentage: 1,
          day2_percentage: 51,
        },
      ],
      falling: [],
      from_date: null,
      to_date: null,
      window_days: 7,
    });
    expect(insights.emerging).toBeNull();
  });

  it("finds a low-usage answer with a meaningful record", () => {
    const insights = computeMetaInsights(snapshot, undefined);
    expect(insights.antiMeta?.name).toBe("Low Usage Answer");
    expect(insights.speedControl?.name).toBe("Tailwind");
    expect(insights.keyItem?.name).toBe("Safety Goggles");
  });

  it("maps confidence bands explicitly", () => {
    expect(confidenceFor(10, 3)).toBe("low");
    expect(confidenceFor(40, 1)).toBe("medium");
    expect(confidenceFor(120, 2)).toBe("high");
  });
});
