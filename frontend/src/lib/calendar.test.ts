import { describe, expect, it } from "vitest";
import type { UpcomingTournament } from "./types";
import { eventToIcs } from "./calendar";

const event: UpcomingTournament = {
  id: "abc-123",
  name: "League Cup Santiago",
  date: "2026-11-22",
  url: "https://www.pokemon.com/event",
  region: null,
  players: null,
  champion_name: null,
  champion_country: null,
  source: "play-pokemon",
  end_date: null,
  tier: "local",
  prize_pool: null,
  time: "15:00:00",
  kind: "League Cup",
  city: "Santiago",
  country: "CL",
  venue: "TCG Arena",
  street_address: "Av. Libertad 123",
  state: "RM",
  postal_code: "8320000",
  latitude: -33.45,
  longitude: -70.66,
  contact_email: "events@example.com",
  contact_phone: null,
  details: null,
  registration_start: "2026-11-22 14:30:00",
  registration_end: "2026-11-22 15:00:00",
  admission: "5000 CLP",
  starts_at: null,
  registrations: null,
  event_website: null,
  third_party_registration_website: null,
};

describe("eventToIcs", () => {
  it("creates an all-day event with time and source in the details", () => {
    const ics = eventToIcs(event, "Play! Pokémon");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261122");
    expect(ics).toContain("DTEND;VALUE=DATE:20261123");
    expect(ics).toContain("SUMMARY:League Cup Santiago (15:00)");
    expect(ics).toContain(
      "LOCATION:Av. Libertad 123",
    );
    expect(ics).toContain("Hora local del evento: 15:00");
    expect(ics).toContain("Fuente: Play! Pokémon");
    expect(ics).toContain("URL:https://www.pokemon.com/event");
    expect(ics).toContain("END:VEVENT");
  });

  it("keeps the whole multi-day range and the cash prize", () => {
    const ics = eventToIcs(
      {
        ...event,
        id: "laic-2027",
        name: "2027 Pokemon Latin America International Championships",
        date: "2026-11-20",
        end_date: "2026-11-22",
        tier: "international",
        prize_pool: "$500,000 USD",
      },
      "Official",
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261120");
    expect(ics).toContain("DTEND;VALUE=DATE:20261123");
    expect(ics).toContain("Premio en efectivo: $500\\,000 USD");
  });
});
