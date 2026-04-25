export const APP_VERSION = "0.1.11.20260425-beta";

export function shortVersion(v: string): string {
  const m = v.match(/^(\d+\.\d+\.\d+)/);
  return m ? `v${m[1]}` : v;
}
