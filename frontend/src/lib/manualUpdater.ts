const LATEST_JSON_URL =
  "https://github.com/felipesuarez-dev/VGC-Reporter/releases/latest/download/latest.json";

interface LatestPlatform {
  signature?: string;
  url: string;
}

export interface LatestJson {
  version: string;
  notes?: string;
  pub_date?: string;
  platforms?: Record<string, LatestPlatform>;
}

export async function fetchLatestJson(): Promise<LatestJson> {
  const res = await fetch(LATEST_JSON_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching latest.json`);
  return (await res.json()) as LatestJson;
}

function parseSemver(v: string): [number, number, number] {
  const m = v.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
}

export function isNewerVersion(remote: string, local: string): boolean {
  const r = parseSemver(remote);
  const l = parseSemver(local);
  for (let i = 0; i < 3; i++) {
    if (r[i] !== l[i]) return r[i] > l[i];
  }
  return false;
}

export function pickAndroidUrl(latest: LatestJson): string | null {
  const direct = latest.platforms?.android?.url;
  if (direct) return direct;
  const fallback = Object.entries(latest.platforms ?? {}).find(([k]) =>
    k.toLowerCase().includes("android"),
  );
  return fallback?.[1]?.url ?? null;
}
