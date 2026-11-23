import { describe, expect, it } from "vitest";
import {
  GLOSSARY_CATEGORIES,
  LEARN_CORE_ARCHETYPES,
  LEARN_GUIDES,
  LEARN_GLOSSARY,
  LEARN_TRIVIA,
  learnLanguage,
} from "./learnContent";

const LOCALES = ["es", "en", "fr", "it", "pt"] as const;

describe("Learn content", () => {
  it("ships 12 rich guides in all five locales", () => {
    for (const locale of LOCALES) {
      expect(LEARN_GUIDES[locale].length).toBeGreaterThanOrEqual(12);
      for (const guide of LEARN_GUIDES[locale]) {
        expect(guide.title.trim().length).toBeGreaterThan(0);
        expect(guide.summary.trim().length).toBeGreaterThan(0);
        expect(guide.sections.length).toBeGreaterThanOrEqual(6);
        for (const section of guide.sections) {
          expect(section.heading.trim().length).toBeGreaterThan(0);
          expect(section.body.trim().length).toBeGreaterThan(20);
        }
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

  it("ships 80+ real glossary terms in every locale and category", () => {
    for (const locale of LOCALES) {
      const glossary = LEARN_GLOSSARY[locale];
      expect(glossary.length).toBeGreaterThanOrEqual(80);
      expect(new Set(glossary.map((entry) => entry.id)).size).toBe(glossary.length);
      for (const category of GLOSSARY_CATEGORIES) {
        expect(glossary.some((entry) => entry.category === category)).toBe(true);
      }
      for (const entry of glossary) {
        expect(entry.term.trim().length).toBeGreaterThan(1);
        expect(entry.definition.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("ships an expanded validated trivia pool", () => {
    for (const locale of LOCALES) {
      expect(LEARN_TRIVIA[locale].length).toBeGreaterThanOrEqual(20);
      for (const item of LEARN_TRIVIA[locale]) {
        expect(item.statement.trim().length).toBeGreaterThan(10);
        expect(item.explanation.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("explains every core archetype with roles, win condition and play plan", () => {
    for (const locale of LOCALES) {
      expect(LEARN_CORE_ARCHETYPES[locale].length).toBeGreaterThanOrEqual(11);
      for (const core of LEARN_CORE_ARCHETYPES[locale]) {
        expect(core.name.trim().length).toBeGreaterThan(0);
        expect(core.roles.trim().length).toBeGreaterThan(10);
        expect(core.winCondition.trim().length).toBeGreaterThan(10);
        expect(core.howToPlay.trim().length).toBeGreaterThan(10);
        expect(core.variants.trim().length).toBeGreaterThan(5);
      }
    }
  });

  it("falls back to English for unknown languages", () => {
    expect(learnLanguage("es-CL")).toBe("es");
    expect(learnLanguage("pt-BR")).toBe("pt");
    expect(learnLanguage("ja-JP")).toBe("en");
  });
});
