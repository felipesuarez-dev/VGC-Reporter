import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./formatDate";

describe("timezone-aware formatting", () => {
  const instant = "2026-11-21T02:00:00Z";

  it("formats timestamps in UTC when requested", () => {
    expect(formatDateTime(instant, "en-US", "UTC")).toContain("2:00");
  });

  it("formats the same instant in the selected zone", () => {
    // Chile is UTC-3 in November (daylight saving time).
    expect(formatDateTime(instant, "en-US", "America/Santiago")).toContain(
      "11:00",
    );
  });

  it("keeps date-only values as calendar dates", () => {
    expect(formatDate("2026-11-21", "es-ES", "UTC")).toContain("21");
  });
});
