import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEED_ROWS,
  feedLayoutMode,
  normalizeFeedPanels,
  normalizeFeedRows,
  placeLiveBelowSummary,
} from "./dashboardStore";

describe("feed rows", () => {
  it("keeps horizontal groups and repairs duplicates or missing panels", () => {
    expect(normalizeFeedRows(DEFAULT_FEED_ROWS)).toEqual(DEFAULT_FEED_ROWS);
    expect(
      normalizeFeedRows([["news", "events", "news"], ["live"], ["nope"]]),
    ).toEqual([["news", "events"], ["live"], ["summary"]]);
  });

  it("accepts the old flat order as one panel per row", () => {
    expect(normalizeFeedRows(["live", "news", "events"])).toEqual([
      ["live"],
      ["news"],
      ["events"],
      ["summary"],
    ]);
  });

  it("puts live below regulation and keeps the other groups", () => {
    expect(
      placeLiveBelowSummary([["summary", "live", "events", "news"]]),
    ).toEqual([["summary"], ["live"], ["events", "news"]]);
    expect(
      placeLiveBelowSummary([["summary"], ["events", "news"], ["live"]]),
    ).toEqual([["summary"], ["live"], ["events", "news"]]);
    expect(
      placeLiveBelowSummary([["summary", "events", "news"], ["live"]]),
    ).toEqual([["summary"], ["live"], ["events", "news"]]);
    expect(placeLiveBelowSummary([["live"], ["summary"], ["news"]])).toEqual([
      ["summary"],
      ["live"],
      ["news"],
    ]);
  });

  it("detects vertical, horizontal and custom layouts", () => {
    expect(
      feedLayoutMode([["summary"], ["live"], ["events"], ["news"]]),
    ).toBe("vertical");
    expect(
      feedLayoutMode([["summary", "live", "events", "news"]]),
    ).toBe("horizontal");
    expect(
      feedLayoutMode([["summary"], ["live", "events"], ["news"]]),
    ).toBe("custom");
  });
});

describe("feed panel preferences", () => {
  it("defaults to expanded and normalizes persisted collapses", () => {
    expect(normalizeFeedPanels(undefined)).toEqual({
      summary: { collapsed: false },
      live: { collapsed: false },
      events: { collapsed: false },
      news: { collapsed: false },
    });
    expect(
      normalizeFeedPanels({
        live: { collapsed: true, orientation: "horizontal" },
        news: { collapsed: "yes" },
      }),
    ).toEqual({
      summary: { collapsed: false },
      live: { collapsed: true },
      events: { collapsed: false },
      news: { collapsed: false },
    });
  });
});
