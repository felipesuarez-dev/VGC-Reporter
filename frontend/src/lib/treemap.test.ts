import { describe, expect, it } from "vitest";
import {
  relativeLuminance,
  treemapLabelLayout,
  treemapTextColor,
} from "./treemap";

describe("treemap presentation", () => {
  it("uses light text on dark type colors and dark text on bright ones", () => {
    expect(treemapTextColor("#1e293b")).toBe("#ffffff");
    expect(treemapTextColor("#4338ca")).toBe("#ffffff");
    expect(treemapTextColor("#facc15")).toBe("#101014");
    expect(treemapTextColor("#67e8f9")).toBe("#101014");
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("hides labels and sprites when the cell is too small", () => {
    expect(treemapLabelLayout(40, 20, true)).toEqual({
      showLabel: false,
      showSprite: false,
      showPercent: false,
    });
    expect(treemapLabelLayout(90, 60, true)).toEqual({
      showLabel: true,
      showSprite: true,
      showPercent: true,
    });
  });
});
