import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEED_ROWS,
  METRICS_PANEL_IDS,
  REGULATION_PANEL_IDS,
  migrateDefaultFeedOrder,
  normalizePanelOrder,
  placeRecentAfterEvents,
  type FeedPanelId,
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

  it("moves recent tournaments after events exactly once", () => {
    const migrated = placeRecentAfterEvents([
      ["summary"],
      ["live"],
      ["events"],
      ["news"],
    ]);
    expect(migrated).toEqual([
      ["summary"],
      ["live"],
      ["events"],
      ["recent"],
      ["news"],
    ]);
    expect(placeRecentAfterEvents(migrated)).toEqual(migrated);
  });

  it("moves recent above events and news directly below live for the legacy default", () => {
    const migrated = migrateDefaultFeedOrder([
      ["summary"],
      ["live"],
      ["events"],
      ["recent"],
      ["news"],
    ]);
    expect(migrated).toEqual([
      ["summary"],
      ["live"],
      ["news"],
      ["recent"],
      ["events"],
    ]);
    expect(migrated).toEqual(DEFAULT_FEED_ROWS);
    expect(migrateDefaultFeedOrder(migrated)).toEqual(migrated);
  });

  it("keeps a custom feed layout untouched", () => {
    const custom: FeedPanelId[][] = [
      ["live", "news"],
      ["recent"],
      ["summary"],
      ["events"],
    ];
    expect(migrateDefaultFeedOrder(custom)).toEqual(custom);
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
