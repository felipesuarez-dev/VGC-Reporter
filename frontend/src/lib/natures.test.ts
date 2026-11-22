import { describe, expect, it } from "vitest";
import { NATURE_BOOSTS, NATURE_EFFECTS, naturesForBoost } from "./natures";

describe("nature table", () => {
  it("contains all 25 natures exactly once", () => {
    expect(NATURE_EFFECTS).toHaveLength(25);
    expect(new Set(NATURE_EFFECTS.map((entry) => entry.nature)).size).toBe(25);
  });

  it("has five neutral natures and four per boosted stat", () => {
    expect(naturesForBoost("neutral")).toHaveLength(5);
    for (const stat of NATURE_BOOSTS) {
      expect(naturesForBoost(stat)).toHaveLength(4);
    }
  });

  it("keeps the documented Adamant and Timid effects", () => {
    expect(
      NATURE_EFFECTS.find((entry) => entry.nature === "Adamant"),
    ).toMatchObject({ up: "atk", down: "spa" });
    expect(
      NATURE_EFFECTS.find((entry) => entry.nature === "Timid"),
    ).toMatchObject({ up: "spe", down: "atk" });
  });
});
