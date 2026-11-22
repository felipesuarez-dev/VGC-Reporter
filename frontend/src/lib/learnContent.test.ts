import { describe, expect, it } from "vitest";
import { LEARN_GUIDES, LEARN_GLOSSARY, learnLanguage } from "./learnContent";

const LOCALES = ["es", "en", "fr", "it", "pt"] as const;

describe("Learn content", () => {
  it("ships complete guides and glossary in all five locales", () => {
    for (const locale of LOCALES) {
      expect(LEARN_GUIDES[locale].length).toBeGreaterThanOrEqual(6);
      expect(LEARN_GLOSSARY[locale].length).toBeGreaterThanOrEqual(8);
      for (const guide of LEARN_GUIDES[locale]) {
        expect(guide.title.trim().length).toBeGreaterThan(0);
        expect(guide.summary.trim().length).toBeGreaterThan(0);
        expect(guide.sections.length).toBeGreaterThan(0);
      }
    }
  });

  it("teaches team construction, not only starter species", () => {
    const word = {
      es: "equipo",
      en: "team",
      fr: "équipe",
      it: "squadra",
      pt: "time",
    } as const;
    for (const locale of LOCALES) {
      const text = LEARN_GUIDES[locale]
        .flatMap((guide) => [guide.title, ...guide.sections.map((section) => section.body)])
        .join(" ")
        .toLowerCase();
      expect(text).toContain(word[locale]);
    }
  });

  it("falls back to English for unknown languages", () => {
    expect(learnLanguage("es-CL")).toBe("es");
    expect(learnLanguage("pt-BR")).toBe("pt");
    expect(learnLanguage("ja-JP")).toBe("en");
  });
});
