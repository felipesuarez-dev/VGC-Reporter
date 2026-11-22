import { useUiStore } from "../stores/uiStore";

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolve the display timezone. `system` (the default) lets Intl use the
 * device zone; any other value is an IANA zone saved from Settings. The
 * timezone is global so the source tooltips, tournament lists and dates all
 * agree.
 */
export function activeTimeZone(explicit?: string | null): string | undefined {
  const setting =
    explicit === undefined ? useUiStore.getState().timeZone : explicit;
  if (!setting || setting === "system") return undefined;
  return setting;
}

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Date-only strings (YYYY-MM-DD) must be parsed as LOCAL time. `new
  // Date("2026-06-17")` is interpreted as UTC midnight, which then renders as
  // the PREVIOUS calendar day in negative-offset timezones (e.g. Chile UTC-4
  // showed a 2026-06-17 window as "Jun 16"). Build the date from components so
  // the calendar day is preserved regardless of the user's timezone.
  if (DATE_ONLY_RE.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  if (locale === "es") return "es-ES";
  if (locale === "en") return "en-US";
  return locale;
}

export function formatDate(
  value: string | null | undefined,
  locale?: string,
  timeZone?: string | null,
): string {
  if (!value) return "";
  const trimmed = value.trim();
  const dateOnly = DATE_ONLY_RE.test(trimmed);
  const d = parseDate(trimmed);
  if (!d) return value;
  const options: Intl.DateTimeFormatOptions = dateOnly
    ? DATE_OPTIONS
    : { ...DATE_OPTIONS, timeZone: activeTimeZone(timeZone) };
  return new Intl.DateTimeFormat(normalizeLocale(locale), options).format(d);
}

export function formatTime(
  value: string | null | undefined,
  locale?: string,
  timeZone?: string | null,
): string {
  if (!value) return "";
  if (!value.includes("T")) return value.slice(0, 5);
  const d = parseDate(value);
  if (!d) return value;
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: activeTimeZone(timeZone),
  }).format(d);
}

export function formatDateTime(
  value: string | null | undefined,
  locale?: string,
  timeZone?: string | null,
): string {
  if (!value) return "";
  if (DATE_ONLY_RE.test(value.trim())) return formatDate(value, locale, timeZone);
  const d = parseDate(value);
  if (!d) return value;
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    ...DATETIME_OPTIONS,
    timeZone: activeTimeZone(timeZone),
  }).format(d);
}

export function formatDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
  locale?: string,
  timeZone?: string | null,
): string {
  const a = formatDate(from, locale, timeZone);
  const b = formatDate(to, locale, timeZone);
  if (a && b) return `${a} - ${b}`;
  return a || b;
}

/**
 * Compact range for tournament rows: `20–22 nov 2026` when both dates share
 * the month, `31 oct – 1 nov 2026` across months, and the full range across
 * years. Date-only values are formatted in local time so the configured
 * timezone never shifts a calendar day.
 */
export function formatEventDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
  locale?: string,
): string {
  if (!from) return "";
  if (!to || to === from) return formatDate(from, locale);
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return formatDateRange(from, to, locale);
  const normalized = normalizeLocale(locale);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const month = new Intl.DateTimeFormat(normalized, { month: "short" });
  const day = new Intl.DateTimeFormat(normalized, { day: "numeric" });
  const year = new Intl.DateTimeFormat(normalized, { year: "numeric" });
  if (sameMonth) {
    return `${day.format(start)}–${day.format(end)} ${month.format(
      start,
    )} ${year.format(start)}`;
  }
  if (sameYear) {
    return `${day.format(start)} ${month.format(start)} – ${day.format(
      end,
    )} ${month.format(end)} ${year.format(end)}`;
  }
  return `${formatDate(from, locale)} – ${formatDate(to, locale)}`;
}
