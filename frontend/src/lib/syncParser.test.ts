import { describe, expect, it } from "vitest";
import {
  formatSyncCode,
  formatSyncCountdown,
  normalizeSyncCode,
  parseSyncInput,
  parseSyncTicket,
  secondsRemaining,
  syncTicketToHttpUrl,
  SYNC_STATE_ORDER,
} from "./sync";

const TOKEN = "a".repeat(32);
const TICKET = `vgcreporter://sync?v=1&code=AB23CD45&token=${TOKEN}&host=192.168.1.20&port=47821`;

describe("sync ticket parser", () => {
  it("normalizes unambiguous codes", () => {
    expect(normalizeSyncCode(" ab23cd45 ")).toBe("AB23CD45");
    expect(normalizeSyncCode("AB12CD34")).toBeNull();
    expect(normalizeSyncCode("ABC")).toBeNull();
    expect(formatSyncCode("AB23CD45")).toBe("AB23 CD45");
  });

  it("parses a versioned QR ticket", () => {
    const ticket = parseSyncTicket(TICKET);
    expect(ticket).toEqual({
      version: 1,
      code: "AB23CD45",
      token: TOKEN,
      host: "192.168.1.20",
      port: 47821,
    });
    expect(syncTicketToHttpUrl(TICKET)).toBe(
      `http://192.168.1.20:47821/sync/v1/bundle?token=${TOKEN}`,
    );
  });

  it("rejects wrong versions, codes, tokens, hosts and ports", () => {
    expect(() => parseSyncTicket(TICKET.replace("v=1", "v=2"))).toThrow();
    expect(() =>
      parseSyncTicket(TICKET.replace("code=AB23CD45", "code=AB12CD34")),
    ).toThrow();
    expect(() =>
      parseSyncTicket(TICKET.replace(TOKEN, "short")),
    ).toThrow();
    expect(() =>
      parseSyncTicket(TICKET.replace("host=192.168.1.20", "host=bad/host")),
    ).toThrow();
    expect(() => parseSyncTicket(TICKET.replace("port=47821", "port=0"))).toThrow();
    expect(() => parseSyncTicket("https://example.com")).toThrow();
  });

  it("keeps legacy HTTP URLs as the advanced fallback", () => {
    expect(parseSyncInput("http://192.168.1.20:47821/bundle?token=abc")).toEqual({
      kind: "legacy",
      url: "http://192.168.1.20:47821/bundle?token=abc",
    });
  });

  it("counts down and exposes the state order", () => {
    const now = Date.parse("2026-11-22T20:00:00Z");
    expect(secondsRemaining("2026-11-22T20:05:00Z", now)).toBe(300);
    expect(formatSyncCountdown(300)).toBe("5:00");
    expect(formatSyncCountdown(9)).toBe("0:09");
    expect(formatSyncCountdown(0)).toBe("0:00");
    expect(SYNC_STATE_ORDER[0]).toBe("waiting");
    expect(SYNC_STATE_ORDER).toContain("imported");
  });
});
