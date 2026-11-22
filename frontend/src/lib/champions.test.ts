import { describe, expect, it } from "vitest";
import {
  SP_MAX_TOTAL,
  evFromSp,
  evsToStatPoints,
  normalizeStatPoints,
  spFromEv,
  statPointsToEvs,
  statPointsTotal,
} from "./champions";

describe("Champions stat conversion", () => {
  it("matches the Pokémon HOME EV to Stat Point table", () => {
    expect(spFromEv(0)).toBe(0);
    expect(spFromEv(3)).toBe(0);
    expect(spFromEv(4)).toBe(1);
    expect(spFromEv(12)).toBe(2);
    expect(spFromEv(252)).toBe(32);
    expect(evFromSp(0)).toBe(0);
    expect(evFromSp(1)).toBe(4);
    expect(evFromSp(2)).toBe(12);
    expect(evFromSp(32)).toBe(252);
  });

  it("turns a classic 252/252/4 spread into a legal 66 SP spread", () => {
    const points = evsToStatPoints({ hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 });
    expect(points.hp).toBe(32);
    expect(points.atk).toBe(32);
    expect(points.spe).toBe(1);
    expect(points.hp).toBeLessThanOrEqual(32);
    expect(statPointsTotal(points)).toBeLessThanOrEqual(SP_MAX_TOTAL);
  });

  it("turns 32/32/2 back into a legal 508 EV spread", () => {
    const evs = statPointsToEvs({ hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 2 });
    const total = evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;
    expect(evs.hp).toBe(252);
    expect(evs.atk).toBe(252);
    expect(total).toBeLessThanOrEqual(508);
    for (const value of Object.values(evs)) expect(value).toBeLessThanOrEqual(252);
  });

  it("normalizes over-budget and per-stat values", () => {
    const normalized = normalizeStatPoints({
      hp: 40,
      atk: 40,
      def: 40,
      spa: 0,
      spd: 0,
      spe: 0,
    });
    expect(normalized.hp).toBeLessThanOrEqual(32);
    expect(statPointsTotal(normalized)).toBe(66);
  });
});
