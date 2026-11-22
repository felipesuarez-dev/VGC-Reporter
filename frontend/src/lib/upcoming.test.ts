import { describe, expect, it } from "vitest";
import {
  cityKey,
  eventAddress,
  eventDayKeys,
  isMajorEvent,
  matchesCity,
  matchesUpcomingQuery,
  parseCityKey,
  splitUpcomingEvents,
} from "./upcoming";

describe("city filters", () => {
  it("keeps same-named cities in different countries distinct", () => {
    expect(cityKey("Santiago", "CL")).toBe("CL|Santiago");
    expect(parseCityKey("CL|Santiago")).toEqual({
      city: "Santiago",
      country: "CL",
    });
    expect(parseCityKey(null)).toBeNull();
  });

  it("matches city and country", () => {
    expect(matchesCity("Santiago", "CL", "CL|Santiago")).toBe(true);
    expect(matchesCity("Santiago", "AR", "CL|Santiago")).toBe(false);
    expect(matchesCity("Santiago", "CL", null)).toBe(true);
    // A city filter only matches events that actually have that city.
    expect(matchesCity(null, null, "CL|Santiago")).toBe(false);
  });
});

describe("event address", () => {
  it("prefers the full street address", () => {
    expect(
      eventAddress({
        street_address: "Av. Libertad 123, Santiago",
        venue: "TCG Arena",
        city: "Santiago",
        state: "RM",
        postal_code: null,
        country: "CL",
      } as never),
    ).toBe("Av. Libertad 123, Santiago");
  });

  it("composes an address from the remaining fields", () => {
    expect(
      eventAddress({
        street_address: null,
        venue: "TCG Arena",
        city: "Santiago",
        state: "RM",
        postal_code: "8320000",
        country: "CL",
      } as never),
    ).toBe("TCG Arena, Santiago, RM, 8320000, CL");
  });

  it("removes placeholder parts coming from upstream data", () => {
    expect(
      eventAddress({
        street_address:
          "196 STA. LUCÍA, SANTIAGO, REGIÓN METROPOLITANA None, CL",
        venue: null,
        city: "Santiago",
        state: null,
        postal_code: null,
        country: "CL",
      } as never),
    ).toBe("196 STA. LUCÍA, SANTIAGO, REGIÓN METROPOLITANA, CL");
  });

  it("drops placeholder-only fields when composing", () => {
    expect(
      eventAddress({
        street_address: null,
        venue: "TCG Arena",
        city: "Santiago",
        state: "None",
        postal_code: "N/A",
        country: "CL",
      } as never),
    ).toBe("TCG Arena, Santiago, CL");
  });
});

describe("free-text search", () => {
  const event = {
    name: "VGC League Challenge",
    venue: "The Big Box",
    city: "Santiago",
    state: "Región Metropolitana",
    postal_code: "8320000",
    country: "CL",
    kind: "League Challenge",
    region: null,
    street_address: "196 STA. LUCÍA, SANTIAGO",
  } as never;

  it("matches names, venues and addresses", () => {
    expect(matchesUpcomingQuery(event, "big box")).toBe(true);
    expect(matchesUpcomingQuery(event, "sta. lucia")).toBe(true);
    expect(matchesUpcomingQuery(event, "sta lucia")).toBe(true);
    expect(matchesUpcomingQuery(event, "8320000")).toBe(true);
  });

  it("ignores accents and case", () => {
    expect(matchesUpcomingQuery(event, "LUCIA")).toBe(true);
    expect(matchesUpcomingQuery(event, "REGION METROPOLITANA")).toBe(true);
  });

  it("accepts an empty query and rejects a missing term", () => {
    expect(matchesUpcomingQuery(event, "  ")).toBe(true);
    expect(matchesUpcomingQuery(event, "Valparaíso")).toBe(false);
  });
});


describe("upcoming split", () => {
  it("separates official Play! Pokemon from Limitless community events", () => {
    const events = [
      { id: "official", source: "play-pokemon" },
      { id: "online", source: "limitless" },
      { id: "other", source: "limitless" },
    ];
    const split = splitUpcomingEvents(events);
    expect(split.official.map((entry) => entry.id)).toEqual(["official"]);
    expect(split.limitless.map((entry) => entry.id)).toEqual(["online", "other"]);
  });

  it("expands multi-day official majors for the calendar", () => {
    expect(
      eventDayKeys({ date: "2026-11-20", end_date: "2026-11-22" }),
    ).toEqual(["2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(eventDayKeys({ date: "2026-11-28", end_date: null })).toEqual([
      "2026-11-28",
    ]);
  });

  it("uses the configured timezone for timed events", () => {
    expect(
      eventDayKeys(
        { date: "2026-11-21", starts_at: "2026-11-21T02:00:00Z" },
        "UTC",
      ),
    ).toEqual(["2026-11-21"]);
    expect(
      eventDayKeys(
        { date: "2026-11-21", starts_at: "2026-11-21T02:00:00Z" },
        "America/Santiago",
      ),
    ).toEqual(["2026-11-20"]);
  });

  it("recognizes Worlds, Internationals, Regionals and Specials as majors", () => {
    for (const tier of ["world", "international", "regional", "special"]) {
      expect(isMajorEvent({ tier, source: "play-pokemon" })).toBe(true);
    }
    expect(isMajorEvent({ tier: "local", source: "play-pokemon" })).toBe(false);
    expect(isMajorEvent({ tier: "community", source: "limitless" })).toBe(false);
  });
});
