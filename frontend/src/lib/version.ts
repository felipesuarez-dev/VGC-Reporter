export const APP_VERSION = "0.6.0.20261122-beta";

export function shortVersion(v: string): string {
  const m = v.match(/^(\d+\.\d+\.\d+)/);
  return m ? `v${m[1]}` : v;
}
