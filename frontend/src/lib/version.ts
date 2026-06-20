export const APP_VERSION = "0.3.0.20260620-beta";

export function shortVersion(v: string): string {
  const m = v.match(/^(\d+\.\d+\.\d+)/);
  return m ? `v${m[1]}` : v;
}
