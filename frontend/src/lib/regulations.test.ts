import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import type { RegulationInfo } from "./types";
import {
  activeRegulation,
  dataDay,
  defaultRangeFor,
  formatOptionFromInfo,
  regulationStatusAt,
} from "./regulations";

const t = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as unknown as TFunction;

function info(over: Partial<RegulationInfo> = {}): RegulationInfo {
  return {
    id: "regulation-m-c",
    label: "Regulation M-C",
    code: "M-C",
    start_at: "2026-09-09T02:00:00Z",
    end_at: "2026-12-02T01:59:00Z",
    status: "active",
    origin: "official",
    confidence: "high",
    seasons: [
      {
        name: "M-8",
        start_at: "2026-11-04T02:00:00Z",
        end_at: "2026-12-02T01:59:00Z",
        active: true,
      },
    ],
    active_season: null,
    eligible_count: 262,
    new_species: [],
    new_megas: [],
    new_items: [],
    new_moves: [],
    sources: [],
    warnings: [],
    ...over,
  };
}

describe("regulation dates", () => {
  it("keeps M-C active on 2026-11-21", () => {
    expect(regulationStatusAt(info(), new Date("2026-11-21T12:00:00Z"))).toBe(
      "active",
    );
  });

  it("uses the official 02:00 UTC instant for starts", () => {
    expect(dataDay("2026-11-04T02:00:00Z", "start")).toBe("2026-11-04");
  });

  it("closes the data day on the previous date for a 01:59 UTC end", () => {
    expect(dataDay("2026-12-02T01:59:00Z", "end")).toBe("2026-12-01");
  });

  it("defaults to the active season, clamped to today", () => {
    const range = defaultRangeFor(info(), new Date("2026-11-21T12:00:00Z"));
    expect(range).toEqual({ from: "2026-11-04", to: "2026-11-21" });
  });

  it("defaults to the M-D season when it becomes active", () => {
    const md = info({
      id: "regulation-m-d",
      code: "M-D",
      label: "Regulation M-D",
      start_at: "2026-12-02T02:00:00Z",
      end_at: null,
      seasons: [
        {
          name: "M-9",
          start_at: "2026-12-02T02:00:00Z",
          end_at: "2027-01-06T01:59:00Z",
          active: true,
        },
      ],
      active_season: {
        name: "M-9",
        start_at: "2026-12-02T02:00:00Z",
        end_at: "2027-01-06T01:59:00Z",
        active: true,
      },
    });
    expect(defaultRangeFor(md, new Date("2026-12-03T12:00:00Z"))).toEqual({
      from: "2026-12-02",
      to: "2026-12-03",
    });
  });

  it("switches at the official 02:00 UTC instant, not midnight", () => {
    const md = info({
      id: "regulation-m-d",
      code: "M-D",
      start_at: "2026-12-02T02:00:00Z",
      end_at: null,
      seasons: [],
    });
    expect(regulationStatusAt(md, new Date("2026-12-02T01:59:00Z"))).toBe(
      "upcoming",
    );
    expect(regulationStatusAt(md, new Date("2026-12-02T02:00:00Z"))).toBe(
      "active",
    );
  });

  it("prefers the newest active regulation", () => {
    const mc = info({
      end_at: "2026-12-02T01:59:00Z",
    });
    const md = info({
      id: "regulation-m-d",
      code: "M-D",
      start_at: "2026-12-02T02:00:00Z",
      end_at: null,
    });
    expect(
      activeRegulation([mc, md], new Date("2026-12-02T02:00:00Z"))?.id,
    ).toBe("regulation-m-d");
  });

  it("marks an upcoming option disabled with the start date", () => {
    const md = info({
      id: "regulation-m-d",
      code: "M-D",
      start_at: "2026-12-02T02:00:00Z",
      end_at: null,
    });
    const option = formatOptionFromInfo(
      t,
      md,
      new Date("2026-11-21T12:00:00Z"),
    );
    expect(option.disabled).toBe(true);
    expect(option.badgeKey).toBe("regulations.coming_soon");
  });
});
