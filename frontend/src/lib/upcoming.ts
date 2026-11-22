import type { UpcomingTournament } from "./types";

/** Drop placeholder values some upstream feeds use for missing address parts. */
function isPlaceholder(value: string): boolean {
  return /^(?:none|null|undefined|n\/a)$/i.test(value.trim());
}

/** Remove empty/placeholder parts and tidy the commas left behind. */
export function sanitizeAddress(value: string): string {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !isPlaceholder(part))
    .join(", ")
    .replace(/\b(?:none|null|undefined|n\/a)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ", ")
    .trim();
}

/** Full street address when Pokedata has one; otherwise a composed address. */
export function eventAddress(event: UpcomingTournament): string {
  const street = event.street_address
    ? sanitizeAddress(event.street_address)
    : "";
  if (street) return street;
  return sanitizeAddress(
    [event.venue, event.city, event.state, event.postal_code, event.country]
      .filter(Boolean)
      .join(", "),
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Free-text search over the fields shown in the event list, including address. */
export function matchesUpcomingQuery(
  event: UpcomingTournament,
  query: string,
): boolean {
  const needle = normalizeSearch(query.trim());
  if (!needle) return true;
  const haystack = [
    event.name,
    event.venue,
    event.city,
    event.state,
    event.postal_code,
    event.country,
    event.kind,
    event.region,
    event.street_address,
    eventAddress(event),
  ]
    .filter(Boolean)
    .join(" ");
  return normalizeSearch(haystack).includes(needle);
}

/** Composite city filter key so same-named cities in different countries stay distinct. */
export function cityKey(city: string, country: string | null): string {
  return `${country ?? ""}|${city}`;
}

export function parseCityKey(
  key: string | null | undefined,
): { city: string; country: string | null } | null {
  if (!key) return null;
  const index = key.indexOf("|");
  if (index < 0) return { city: key, country: null };
  const country = key.slice(0, index) || null;
  const city = key.slice(index + 1);
  return city ? { city, country } : null;
}

export function matchesCity(
  eventCity: string | null | undefined,
  eventCountry: string | null | undefined,
  key: string | null | undefined,
): boolean {
  const filter = parseCityKey(key);
  if (!filter) return true;
  // Online tournaments have no city/country. They must remain visible when a
  // local country is selected; the filter is about the local scene, not about
  // hiding international online events.
  if (!eventCity && !eventCountry) return true;
  if (!eventCity || eventCity !== filter.city) return false;
  return !filter.country || eventCountry === filter.country;
}
