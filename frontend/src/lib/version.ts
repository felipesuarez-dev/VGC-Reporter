export const APP_VERSION = "0.2.1.20260517-beta";

export function shortVersion(v: string): string {
  const m = v.match(/^(\d+\.\d+\.\d+)/);
  return m ? `v${m[1]}` : v;
}
