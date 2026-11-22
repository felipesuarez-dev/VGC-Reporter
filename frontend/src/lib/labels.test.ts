import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import { formatViolation, prettifyItemName } from "./labels";

const t = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as unknown as TFunction;

describe("prettifyItemName", () => {
  it("splits Showdown-style concatenated item ids", () => {
    expect(prettifyItemName("BrightPowder")).toBe("Bright Powder");
    expect(prettifyItemName("TwistedSpoon")).toBe("Twisted Spoon");
    expect(prettifyItemName("Leftovers")).toBe("Leftovers");
    expect(prettifyItemName("King's Rock")).toBe("King's Rock");
  });
});

describe("formatViolation", () => {
  it("renders the backend slot as-is (already 1-based)", () => {
    const text = formatViolation(t, {
      kind: "missing_item",
      slot: 3,
      species: "Incineroar",
    });
    expect(text).toContain('"slot":3');
    expect(text).not.toContain('"slot":4');
  });

  it("keeps the move and item slot numbers stable", () => {
    const move = formatViolation(t, {
      kind: "move_not_allowed",
      slot: 2,
      species: "Rillaboom",
      mv: "Grassy Glide",
    });
    expect(move).toContain('"slot":2');
  });
});
