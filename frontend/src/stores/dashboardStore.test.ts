import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEED_ROWS,
  FEED_PANEL_IDS,
  METRICS_PANEL_IDS,
  REGULATION_PANEL_IDS,
  normalizePanelOrder,
  normalizePanelPrefs,
  normalizePanelRows,
  panelLayoutMode,
} from "./dashboardStore";

describe("normalizePanelRows", () => {
  it("keeps a valid custom layout", () => {
    expect(
      normalizePanelRows([["live", "news"], ["summary"]], FEED_PANEL_IDS),
    ).toEqual([["live", "news"], ["summary"]]);
  });

  it("drops unknown and duplicate ids and appends missing panels", () => {
    const normalized = normalizePanelRows(
      [["summary", "unknown", "summary"], ["live"]],
      FEED_PANEL_IDS,
    );
    expect(normalized).toEqual([["summary"], ["live"], ["news"]]);
    expect(new Set(normalized.flat()).size).toBe(normalized.flat().length);
  });

  it("repairs layouts saved before 0.7.0 (events/recent are gone)", () => {
    const migrated = normalizePanelRows(
      [["summary"], ["live"], ["events"], ["recent"], ["news"]],
      FEED_PANEL_IDS,
    );
    expect(migrated).toEqual(DEFAULT_FEED_ROWS);
  });

  it("accepts the old flat order format", () => {
    expect(normalizePanelRows(["news", "summary", "live"], FEED_PANEL_IDS)).toEqual([
      ["news"],
      ["summary"],
      ["live"],
    ]);
  });
});

describe("normalizePanelPrefs", () => {
  it("defaults every missing panel to expanded", () => {
    const prefs = normalizePanelPrefs({ live: { collapsed: true } }, FEED_PANEL_IDS);
    expect(prefs.live.collapsed).toBe(true);
    expect(prefs.summary.collapsed).toBe(false);
    expect(prefs.news.collapsed).toBe(false);
  });
});

describe("panelLayoutMode", () => {
  it("detects vertical, horizontal and custom rows", () => {
    expect(panelLayoutMode([["summary"], ["live"]])).toBe("vertical");
    expect(panelLayoutMode([["summary", "live"]])).toBe("horizontal");
    expect(panelLayoutMode([["summary", "live"], ["news"]])).toBe("custom");
  });
});

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
  });

  it("falls back to the full default order for malformed state", () => {
    expect(normalizePanelOrder(null, REGULATION_PANEL_IDS)).toEqual([
      "roster",
      "items",
      "megas",
    ]);
  });
});
