import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import es from "../locales/es.json";
import en from "../locales/en.json";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("Umbreon, Zekrom and Reshiram themes", () => {
  it("keeps theme names clean and moves the description to a hint", () => {
    for (const locale of [es, en]) {
      expect(locale.ui.theme_umbreon).toBe("Umbreon");
      expect(locale.ui.theme_zekrom).toBe("Zekrom");
      expect(locale.ui.theme_reshiram).toBe("Reshiram");
      expect(locale.ui.theme_umbreon).not.toContain("(");
      expect(locale.ui.theme_zekrom).not.toContain("(");
      expect(locale.ui.theme_reshiram).not.toContain("(");
      expect(locale.ui.theme_umbreon_hint.length).toBeGreaterThan(10);
      expect(locale.ui.theme_zekrom_hint.length).toBeGreaterThan(10);
      expect(locale.ui.theme_reshiram_hint.length).toBeGreaterThan(10);
    }
    expect(es.ui.theme_umbreon_hint).toMatch(/amarill/i);
    expect(es.ui.theme_zekrom_hint).toMatch(/contraste/i);
    expect(es.ui.theme_reshiram_hint).toMatch(/claro/i);
  });

  it("defines true black Umbreon with yellow dividers", () => {
    expect(styles).toContain(":root.theme-umbreon");
    expect(styles).toContain("--bg: #000000");
    expect(styles).toContain("--border: #f5c542");
  });

  it("defines a real high-contrast Zekrom with electric blue dividers", () => {
    expect(styles).toContain(":root.theme-zekrom");
    expect(styles).toContain("--bg: #000308");
    expect(styles).toContain("--border: #00a2ff");
    expect(styles).toContain("--text: #ffffff");
  });

  it("defines a light high-contrast Reshiram with black dividers", () => {
    expect(styles).toContain(":root.theme-reshiram");
    expect(styles).toContain("--bg: #ffffff");
    expect(styles).toContain("--border: #000000");
    expect(styles).toContain("--text: #000000");
  });
});
