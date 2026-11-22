import { describe, expect, it } from "vitest";
import {
  cityKey,
  eventAddress,
  matchesCity,
  matchesUpcomingQuery,
  parseCityKey,
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
    // Online events have no city/country and must stay visible.
    expect(matchesCity(null, null, "CL|Santiago")).toBe(true);
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

