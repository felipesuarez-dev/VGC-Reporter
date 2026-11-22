import type { UpcomingTournament } from "./types";
import { formatTime } from "./formatDate";
import { eventAddress } from "./upcoming";

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function dateOnly(value: string): string {
  return value.replace(/-/g, "");
}

function nextDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(year, month - 1, day + 1);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("");
}

function stamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/**
 * Builds an all-day `.ics` event. Event times are local to the venue and we do
 * not know its IANA zone, so the time is included in the title/description
 * instead of guessing a timezone that could shift the calendar entry.
 */
export function eventToIcs(
  event: UpcomingTournament,
  sourceLabel: string,
  locale?: string,
): string {
  const time =
    event.starts_at || event.time
      ? formatTime(event.starts_at ?? event.time, locale)
      : null;
  const location = eventAddress(event);
  const description = [
    time ? `Hora local del evento: ${time}` : null,
    `Fuente: ${sourceLabel}`,
    event.kind ? `Tipo: ${event.kind}` : null,
    event.tier ? `Nivel: ${event.tier}` : null,
    event.prize_pool ? `Premio en efectivo: ${event.prize_pool}` : null,
    event.admission ? `Entrada: ${event.admission}` : null,
    event.registration_start || event.registration_end
      ? `Inscripción: ${[event.registration_start, event.registration_end]
          .filter(Boolean)
          .join(" → ")}`
      : null,
    event.contact_email ? `Contacto: ${event.contact_email}` : null,
    event.contact_phone ? `Teléfono: ${event.contact_phone}` : null,
    event.details,
    event.url,
  ]
    .filter(Boolean)
    .join("\n");
  const summary = `${event.name}${time ? ` (${time})` : ""}`;
  const lastDay =
    event.end_date && event.end_date > event.date ? event.end_date : event.date;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PumaSoft//VGC Reporter//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(event.id)}@vgc-reporter`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${dateOnly(event.date)}`,
    `DTEND;VALUE=DATE:${nextDate(lastDay)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `URL:${escapeIcs(event.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Triggers a download that Google/Outlook/Apple Calendar can import. */
export function downloadIcs(
  event: UpcomingTournament,
  sourceLabel: string,
  locale?: string,
) {
  const blob = new Blob([eventToIcs(event, sourceLabel, locale)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vgc-${event.id.replace(/[^a-z0-9]+/gi, "-")}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
