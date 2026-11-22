import type { UpcomingTournament } from "./types";
import { activeTimeZone } from "./formatDate";

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
  // A city filter must not match events without a city. Online events live in
  // their own tab and do not use the location filters.
  if (!eventCity || eventCity !== filter.city) return false;
  return !filter.country || eventCountry === filter.country;
}

/** Play! Pokémon in-person events vs Limitless community online events. */
export function splitUpcomingEvents<T extends { source: string }>(events: T[]): {
  official: T[];
  limitless: T[];
} {
  return {
    official: events.filter((event) => event.source === "play-pokemon"),
    limitless: events.filter((event) => event.source !== "play-pokemon"),
  };
}

const MAJOR_TIERS = new Set(["world", "international", "regional", "special"]);

/** Championship Series majors are highlighted differently from local events. */
export function isMajorEvent(event: {
  tier?: string | null;
  source?: string | null;
}): boolean {
  return Boolean(event.tier && MAJOR_TIERS.has(event.tier));
}

function parseDay(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Calendar day of an instant in the configured display timezone. */
function instantDayKey(value: string, timeZone?: string | null): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: activeTimeZone(timeZone),
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  const key = `${part("year")}-${part("month")}-${part("day")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

/**
 * Every calendar day covered by an event. Multi-day majors (LAIC, NAIC,
 * Regionals, Worlds) appear on each day of their range; single-day events
 * return their own date. Date-only values stay local so the configured
 * timezone never shifts them to the previous day. Timed events use the
 * configured timezone to decide which calendar day they belong to.
 */
export function eventDayKeys(
  event: {
    date: string;
    end_date?: string | null;
    starts_at?: string | null;
  },
  timeZone?: string | null,
): string[] {
  const startKey =
    (event.starts_at ? instantDayKey(event.starts_at, timeZone) : null) ??
    event.date;
  const start = parseDay(startKey);
  const end = event.end_date ? parseDay(event.end_date) : null;
  if (!start || !end || event.end_date === startKey) return [startKey];
  if (end < start) return [startKey];
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < 21) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.length > 0 ? days : [startKey];
}
