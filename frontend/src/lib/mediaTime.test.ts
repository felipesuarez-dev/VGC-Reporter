import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./mediaTime";

const NOW = Date.parse("2026-11-24T12:00:00Z");

describe("formatRelativeTime", () => {
  it("formats days in Spanish", () => {
    const value = new Date(NOW - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(value, "es", NOW)).toBe("ayer");
  });

  it("formats hours in Spanish", () => {
    const value = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(value, "es", NOW)).toBe("hace 2 horas");
  });

  it("formats weeks in English", () => {
    const value = new Date(NOW - 21 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(value, "en", NOW)).toBe("3 weeks ago");
  });

  it("returns an empty string for missing or invalid values", () => {
    expect(formatRelativeTime(null, "es", NOW)).toBe("");
    expect(formatRelativeTime("not-a-date", "es", NOW)).toBe("");
  });
});
