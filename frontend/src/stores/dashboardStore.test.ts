import { describe, expect, it } from "vitest";
import {
  METRICS_PANEL_IDS,
  REGULATION_PANEL_IDS,
  normalizePanelOrder,
} from "./dashboardStore";

describe("normalizePanelOrder", () => {
  it("keeps a valid custom order", () => {
    expect(normalizePanelOrder(["trending", "top_pokemon"], METRICS_PANEL_IDS)).toEqual([
      "trending",
      "top_pokemon",
      ...METRICS_PANEL_IDS.filter((id) => id !== "trending" && id !== "top_pokemon"),
    ]);
  });

  it("drops unknown and duplicate ids and appends missing panels", () => {
    const normalized = normalizePanelOrder(
      ["roster", "unknown", "roster", 42],
      REGULATION_PANEL_IDS,
    );
    expect(normalized).toEqual(["roster", "items", "megas"]);
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it("falls back to the full default order for malformed state", () => {
    expect(normalizePanelOrder(null, REGULATION_PANEL_IDS)).toEqual([
      "roster",
      "items",
      "megas",
    ]);
    expect(normalizePanelOrder({ nope: true }, METRICS_PANEL_IDS)).toEqual([
      ...METRICS_PANEL_IDS,
    ]);
  });
});
