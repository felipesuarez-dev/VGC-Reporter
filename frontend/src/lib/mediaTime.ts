function normalizeLocale(locale?: string): string {
  if (!locale) return "en-US";
  if (locale === "es") return "es-ES";
  if (locale === "en") return "en-US";
  return locale;
}

/**
 * "Hace 1 día" for a past broadcast. YouTube only exposes relative text
 * ("Streamed 1d ago"), so the backend turns it into an approximate instant;
 * formatting it here keeps the label in the active language.
 */
export function formatRelativeTime(
  value: string | null | undefined,
  locale?: string,
  now: number = Date.now(),
): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";
  const diffSeconds = Math.round((timestamp - now) / 1000);
  const abs = Math.abs(diffSeconds);

  let unit: Intl.RelativeTimeFormatUnit = "second";
  let divisor = 1;
  if (abs >= 365 * 24 * 60 * 60) {
    unit = "year";
    divisor = 365 * 24 * 60 * 60;
  } else if (abs >= 30 * 24 * 60 * 60) {
    unit = "month";
    divisor = 30 * 24 * 60 * 60;
  } else if (abs >= 7 * 24 * 60 * 60) {
    unit = "week";
    divisor = 7 * 24 * 60 * 60;
  } else if (abs >= 24 * 60 * 60) {
    unit = "day";
    divisor = 24 * 60 * 60;
  } else if (abs >= 60 * 60) {
    unit = "hour";
    divisor = 60 * 60;
  } else if (abs >= 60) {
    unit = "minute";
    divisor = 60;
  }

  return new Intl.RelativeTimeFormat(normalizeLocale(locale), {
    numeric: "auto",
  }).format(Math.round(diffSeconds / divisor), unit);
}
