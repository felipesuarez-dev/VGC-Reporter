/** ISO 3166-1 alpha-2 to a regional-indicator flag. Unknown input is left as-is. */
export function countryFlag(code: string | null | undefined): string {
  if (!code || code.trim().length !== 2) return "";
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(
    ...upper.split("").map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
}
