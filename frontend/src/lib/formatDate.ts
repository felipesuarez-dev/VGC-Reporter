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

export function formatDate(value: string | null | undefined, locale?: string): string {
  const d = parseDate(value);
  if (!d) return value ?? "";
  return new Intl.DateTimeFormat(normalizeLocale(locale), DATE_OPTIONS).format(d);
}

export function formatDateTime(value: string | null | undefined, locale?: string): string {
  if (!value) return "";
  if (DATE_ONLY_RE.test(value.trim())) return formatDate(value, locale);
  const d = parseDate(value);
  if (!d) return value;
  return new Intl.DateTimeFormat(normalizeLocale(locale), DATETIME_OPTIONS).format(d);
}

export function formatDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
  locale?: string,
): string {
  const a = parseDate(from);
  const b = parseDate(to);
  const fmt = new Intl.DateTimeFormat(normalizeLocale(locale), DATE_OPTIONS);
  if (a && b) return `${fmt.format(a)} — ${fmt.format(b)}`;
  if (a) return fmt.format(a);
  if (b) return fmt.format(b);
  return "";
}
