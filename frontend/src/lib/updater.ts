export interface DesktopPlatformMeta {
  url: string | null;
  signature: string | null;
}

/** Extract the Windows bundle from the raw latest.json returned by the updater plugin. */
export function desktopPlatformMeta(raw: Record<string, unknown>): DesktopPlatformMeta {
  const platforms = raw.platforms;
  if (!platforms || typeof platforms !== "object") {
    return { url: null, signature: null };
  }
  const entries = platforms as Record<string, unknown>;
  const key = ["windows-x86_64-msi", "windows-x86_64"].find(
    (candidate) => candidate in entries,
  );
  const entry = key
    ? (entries[key] as Record<string, unknown> | undefined)
    : undefined;
  return {
    url: typeof entry?.url === "string" ? entry.url : null,
    signature: typeof entry?.signature === "string" ? entry.signature : null,
  };
}

export function shortSignature(value: string | null | undefined): string {
  if (!value) return "—";
  return value.length > 28 ? `${value.slice(0, 28)}…` : value;
}
