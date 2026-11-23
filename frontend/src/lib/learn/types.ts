export type LearnLang = "es" | "en" | "fr" | "it" | "pt";

export interface LearnGuideSection {
  heading: string;
  body: string;
}

export interface LearnGuide {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: "beginner" | "intermediate" | "advanced";
  sections: LearnGuideSection[];
}

export type GlossaryCategory =
  | "fundamentals"
  | "combat"
  | "team"
  | "tournament"
  | "stats"
  | "format";

export interface GlossaryEntry {
  id: string;
  category: GlossaryCategory;
  term: string;
  definition: string;
}

export interface TriviaItem {
  id: string;
  statement: string;
  answer: boolean;
  explanation: string;
}

export interface LocalizedText {
  es: string;
  en: string;
  fr: string;
  it: string;
  pt: string;
}

export interface CoreArchetypeText {
  name: string;
  summary: string;
  roles: string;
  winCondition: string;
  howToPlay: string;
  variants: string;
}

export interface CoreArchetypeSeed {
  id: string;
  icon: string;
  text: Record<LearnLang, CoreArchetypeText>;
}

export interface CoreArchetype extends CoreArchetypeText {
  id: string;
  icon: string;
}

export function learnLanguage(raw: string): LearnLang {
  const head = raw.slice(0, 2).toLowerCase();
  return head === "es" || head === "fr" || head === "it" || head === "pt"
    ? head
    : "en";
}
