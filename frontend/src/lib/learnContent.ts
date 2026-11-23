import { CORE_SEEDS } from "./learn/cores";
import { GLOSSARY_SEEDS } from "./learn/glossary";
import { GUIDE_SEEDS } from "./learn/guides";
import { TRIVIA_SEEDS } from "./learn/trivia";
import {
  learnLanguage,
  type CoreArchetype,
  type GlossaryCategory,
  type GlossaryEntry,
  type LearnGuide,
  type LearnLang,
  type TriviaItem,
} from "./learn/types";

export type {
  CoreArchetype,
  GlossaryCategory,
  GlossaryEntry,
  LearnGuide,
  LearnLang,
  TriviaItem,
};
export { learnLanguage };

const LANGS: LearnLang[] = ["es", "en", "fr", "it", "pt"];

function byLang<T>(
  build: (lang: LearnLang) => T,
): Record<LearnLang, T> {
  return Object.fromEntries(LANGS.map((lang) => [lang, build(lang)])) as Record<
    LearnLang,
    T
  >;
}

export const LEARN_GUIDES: Record<LearnLang, LearnGuide[]> = byLang((lang) =>
  GUIDE_SEEDS.map((seed) => ({
    id: seed.id,
    minutes: seed.minutes,
    level: seed.level,
    ...seed.text[lang],
  })),
);

export const LEARN_GLOSSARY: Record<LearnLang, GlossaryEntry[]> = byLang((lang) =>
  GLOSSARY_SEEDS.map((seed) => ({
    id: seed.id,
    category: seed.category,
    ...seed.text[lang],
  })),
);

export const LEARN_TRIVIA: Record<LearnLang, TriviaItem[]> = byLang((lang) =>
  TRIVIA_SEEDS.map((seed) => ({
    id: seed.id,
    ...seed.text[lang],
  })),
);

export const LEARN_CORE_ARCHETYPES: Record<LearnLang, CoreArchetype[]> =
  byLang((lang) =>
    CORE_SEEDS.map((seed) => ({
      id: seed.id,
      icon: seed.icon,
      ...seed.text[lang],
    })),
  );

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  "fundamentals",
  "combat",
  "team",
  "tournament",
  "stats",
  "format",
];
