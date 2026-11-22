import type { EvSpread, StatPointSpread } from "./types";

export const SP_MAX_PER_STAT = 32;
export const SP_MAX_TOTAL = 66;
export const EV_MAX_PER_STAT = 252;
export const EV_MAX_TOTAL = 508;

const KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;

export function spFromEv(ev: number): number {
  if (ev < 4) return 0;
  return Math.min(SP_MAX_PER_STAT, 1 + Math.floor((ev - 4) / 8));
}

export function evFromSp(sp: number): number {
  if (sp <= 0) return 0;
  if (sp === 1) return 4;
  return Math.min(EV_MAX_PER_STAT, 4 + (sp - 1) * 8);
}

export function evsToStatPoints(evs: EvSpread): StatPointSpread {
  const points = Object.fromEntries(
    KEYS.map((key) => [key, spFromEv(evs[key])]),
  ) as StatPointSpread;
  return normalizeStatPoints(points);
}

export function statPointsToEvs(points: StatPointSpread): EvSpread {
  const evs = Object.fromEntries(
    KEYS.map((key) => [key, evFromSp(points[key])]),
  ) as EvSpread;
  let total = KEYS.reduce((sum, key) => sum + evs[key], 0);
  while (total > EV_MAX_TOTAL) {
    const key = [...KEYS]
      .filter((entry) => evs[entry] > 0)
      .sort((a, b) => evs[a] - evs[b])[0];
    if (!key) break;
    const trim = Math.min(4, evs[key]);
    evs[key] -= trim;
    total -= trim;
  }
  return evs;
}

export function normalizeStatPoints(points: StatPointSpread): StatPointSpread {
  const next = { ...points };
  for (const key of KEYS) {
    next[key] = Math.max(0, Math.min(SP_MAX_PER_STAT, Math.round(next[key])));
  }
  while (KEYS.reduce((sum, key) => sum + next[key], 0) > SP_MAX_TOTAL) {
    const key = [...KEYS].sort((a, b) => next[b] - next[a])[0];
    next[key] -= 1;
  }
  return next;
}

export function statPointsTotal(points: StatPointSpread): number {
  return KEYS.reduce((sum, key) => sum + points[key], 0);
}

/** A blank Champions spread that spends the full 66 points on a simple role. */
export function defaultStatPoints(): StatPointSpread {
  return { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 };
}
