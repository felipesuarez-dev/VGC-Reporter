import { describe, expect, it } from "vitest";
import { defensiveMultiplier, resistancesOf, weaknessesOf } from "./typeChart";
import { countryFlag } from "./countryFlag";
import { ALL_THEMES } from "../stores/uiStore";

describe("TypeLab chart", () => {
  it("handles single, dual and immune matchups", () => {
    expect(defensiveMultiplier(["Fire"], "Water")).toBe(2);
    expect(defensiveMultiplier(["Grass", "Flying"], "Ice")).toBe(4);
    expect(defensiveMultiplier(["Ghost"], "Normal")).toBe(0);
    expect(defensiveMultiplier(["Water", "Dragon"], "Fire")).toBe(0.25);
  });

  it("lists 4x weaknesses first", () => {
    expect(weaknessesOf(["Fire", "Flying"])[0]).toEqual({ type: "Rock", mult: 4 });
  });

  it("lists immunities in resistances", () => {
    const monkey = resistancesOf(["Normal", "Ghost"]);
    expect(monkey.some((entry) => entry.type === "Normal" && entry.mult === 0)).toBe(true);
  });
});

describe("countryFlag", () => {
  it("renders a flag for valid ISO codes and ignores junk", () => {
    expect(countryFlag("cl")).toBe("🇨🇱");
    expect(countryFlag("CHL")).toBe("");
    expect(countryFlag(null)).toBe("");
  });
});

describe("themes", () => {
  it("offers Umbreon and Zekrom alongside the existing themes", () => {
    expect(ALL_THEMES).toContain("umbreon");
    expect(ALL_THEMES).toContain("zekrom");
    expect(new Set(ALL_THEMES).size).toBe(ALL_THEMES.length);
  });
});
