import type { TFunction } from "i18next";
import {
  ALL_NATURES,
  ALL_TYPES,
  canonicalSpeciesId,
  type Nature,
  type Pokemon,
  type PokemonType,
  type PokemonUsage,
} from "../types";
import { evFromSp } from "../champions";
import {
  NATURE_EFFECTS,
  type NatureEffect,
  type NatureStat,
} from "../natures";
import { defensiveMultiplier } from "../typeChart";
import { natureLabel, statLabel, typeLabel } from "../labels";

export type PracticeKind =
  | "type"
  | "speed"
  | "lead"
  | "nature"
  | "stat_points"
  | "clause";

export interface PracticeOption {
  value: string;
  label: string;
}

export interface PracticeQuestion {
  id: string;
  kind: PracticeKind;
  prompt: string;
  options: PracticeOption[];
  correct: string;
  explanation: string;
}

type Rng = () => number;

const CHART_TYPES = ALL_TYPES.filter(
  (type): type is Exclude<PokemonType, "Stellar"> => type !== "Stellar",
);

export function mulberry32(seed: number): Rng {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function daySeed(dateKey: string): number {
  return [...dateKey].reduce(
    (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
    7,
  );
}

function pick<T>(rng: Rng, values: T[]): T {
  return values[Math.floor(rng() * values.length) % values.length];
}

function shuffle<T>(rng: Rng, values: T[]): T[] {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function typeQuestion(t: TFunction, rng: Rng, index: number): PracticeQuestion {
  const defender = pick(rng, CHART_TYPES);
  const correctTypes = CHART_TYPES.filter(
    (attacker) => defensiveMultiplier([defender], attacker) >= 2,
  );
  const correct = pick(rng, correctTypes.length > 0 ? correctTypes : CHART_TYPES);
  const wrong = shuffle(
    rng,
    CHART_TYPES.filter(
      (attacker) =>
        attacker !== correct && defensiveMultiplier([defender], attacker) < 2,
    ),
  ).slice(0, 3);
  const options = shuffle(rng, [correct, ...wrong]).map((type) => ({
    value: type,
    label: typeLabel(t, type),
  }));
  const multiplier = defensiveMultiplier([defender], correct);
  return {
    id: `type-${index}`,
    kind: "type",
    prompt: t("practice.type_prompt", { type: typeLabel(t, defender) }),
    options,
    correct,
    explanation: t("practice.type_explanation", {
      attacker: typeLabel(t, correct),
      defender: typeLabel(t, defender),
      multiplier,
    }),
  };
}

function speedQuestion(
  t: TFunction,
  rng: Rng,
  index: number,
  meta: PokemonUsage[],
  pokedex: Map<string, Pokemon>,
): PracticeQuestion | null {
  const known = meta
    .map((entry) => pokedex.get(canonicalSpeciesId(entry.species)))
    .filter((pokemon): pokemon is Pokemon => Boolean(pokemon?.base_stats));
  const unique = known.filter(
    (pokemon, position) =>
      known.findIndex((entry) => entry.id === pokemon.id) === position,
  );
  if (unique.length < 2) return null;
  const first = pick(rng, unique);
  const second = pick(
    rng,
    unique.filter((pokemon) => pokemon.id !== first.id),
  );
  if (!second || first.base_stats.spe === second.base_stats.spe) return null;
  const faster = first.base_stats.spe > second.base_stats.spe ? first : second;
  return {
    id: `speed-${index}`,
    kind: "speed",
    prompt: t("practice.speed_prompt", { a: first.name, b: second.name }),
    options: [
      { value: first.name, label: first.name },
      { value: second.name, label: second.name },
    ],
    correct: faster.name,
    explanation: t("practice.speed_explanation", {
      faster: faster.name,
      a: first.name,
      aSpeed: first.base_stats.spe,
      b: second.name,
      bSpeed: second.base_stats.spe,
    }),
  };
}

function leadQuestion(
  t: TFunction,
  rng: Rng,
  index: number,
  meta: PokemonUsage[],
  pokedex: Map<string, Pokemon>,
): PracticeQuestion | null {
  const known = meta
    .map((entry) => pokedex.get(canonicalSpeciesId(entry.species)))
    .filter((pokemon): pokemon is Pokemon => Boolean(pokemon?.types?.length));
  const unique = known.filter(
    (pokemon, position) =>
      known.findIndex((entry) => entry.id === pokemon.id) === position,
  );
  if (unique.length < 4) return null;
  const threat = pick(rng, unique);
  const picks = shuffle(
    rng,
    unique.filter((pokemon) => pokemon.id !== threat.id),
  ).slice(0, 3);
  const score = (candidate: Pokemon) =>
    threat.types.reduce(
      (total, attacking) => total + defensiveMultiplier(candidate.types, attacking),
      0,
    );
  const winner = [...picks].sort(
    (a, b) => score(a) - score(b) || b.base_stats.spe - a.base_stats.spe,
  )[0];
  return {
    id: `lead-${index}`,
    kind: "lead",
    prompt: t("practice.lead_prompt", { threat: threat.name }),
    options: picks.map((pokemon) => ({
      value: pokemon.name,
      label: pokemon.name,
    })),
    correct: winner.name,
    explanation: t("practice.lead_explanation", {
      answer: winner.name,
      threat: threat.name,
      types: threat.types.map((type) => typeLabel(t, type)).join(" / "),
    }),
  };
}

function natureQuestion(t: TFunction, rng: Rng, index: number): PracticeQuestion {
  const effect = pick(rng, NATURE_EFFECTS);
  const effectLabel = (entry: NatureEffect) =>
    entry.up
      ? t("practice.nature_effect", {
          up: statLabel(t, entry.up),
          down: statLabel(t, entry.down as NatureStat),
        })
      : t("practice.nature_neutral");
  const correct = effectLabel(effect);
  const wrong = shuffle(
    rng,
    NATURE_EFFECTS.filter((entry) => effectLabel(entry) !== correct),
  )
    .slice(0, 3)
    .map(effectLabel);
  return {
    id: `nature-${index}`,
    kind: "nature",
    prompt: t("practice.nature_prompt", { nature: natureLabel(t, effect.nature) }),
    options: shuffle(rng, [correct, ...wrong]).map((label) => ({
      value: label,
      label,
    })),
    correct,
    explanation: t("practice.nature_explanation", {
      nature: natureLabel(t, effect.nature),
      effect: correct,
    }),
  };
}

function statPointsQuestion(t: TFunction, rng: Rng, index: number): PracticeQuestion {
  const points = 2 + Math.floor(rng() * 9);
  const correct = String(evFromSp(points));
  const wrong = [evFromSp(points) - 4, evFromSp(points) + 4, evFromSp(points) + 8]
    .filter((value) => value > 0 && String(value) !== correct)
    .slice(0, 3)
    .map(String);
  while (wrong.length < 3) {
    const candidate = String(evFromSp(points) + (wrong.length + 1) * 8);
    if (!wrong.includes(candidate) && candidate !== correct) wrong.push(candidate);
  }
  return {
    id: `stat-points-${index}`,
    kind: "stat_points",
    prompt: t("practice.stat_points_prompt", { points }),
    options: shuffle(rng, [correct, ...wrong]).map((value) => ({ value, label: value })),
    correct,
    explanation: t("practice.stat_points_explanation", {
      points,
      evs: correct,
    }),
  };
}

function clauseQuestion(t: TFunction, rng: Rng, index: number): PracticeQuestion {
  const scenarios = [
    { key: "practice.clause_duplicate_item", legal: false },
    { key: "practice.clause_duplicate_species", legal: false },
    { key: "practice.clause_two_sash", legal: false },
    { key: "practice.clause_legal_team", legal: true },
  ] as const;
  const scenario = pick(rng, [...scenarios]);
  const correct = scenario.legal ? "legal" : "illegal";
  return {
    id: `clause-${index}`,
    kind: "clause",
    prompt: t(scenario.key),
    options: [
      { value: "legal", label: t("practice.legal") },
      { value: "illegal", label: t("practice.illegal") },
    ],
    correct,
    explanation: t(
      scenario.legal ? "practice.clause_legal_explanation" : "practice.clause_illegal_explanation",
    ),
  };
}

export interface PracticeContext {
  t: TFunction;
  dateKey: string;
  meta: PokemonUsage[];
  pokedex: Pokemon[];
  count?: number;
}

/**
 * Ten deterministic questions per day. The generator uses real meta species
 * and the same type chart/nature data as the rest of the app; it never stores
 * a hand-written "correct answer" that can drift from the data.
 */
export function dailyPractice({
  t,
  dateKey,
  meta,
  pokedex,
  count = 10,
}: PracticeContext): PracticeQuestion[] {
  const rng = mulberry32(daySeed(dateKey));
  const pokedexById = new Map(
    pokedex.map((pokemon) => [canonicalSpeciesId(pokemon.name), pokemon]),
  );
  const kinds: PracticeKind[] = [
    "type",
    "speed",
    "nature",
    "lead",
    "stat_points",
    "clause",
    "type",
    "lead",
    "nature",
    "speed",
    "stat_points",
    "clause",
  ];
  const questions: PracticeQuestion[] = [];
  let attempts = 0;
  while (questions.length < count && attempts < count * 8) {
    const kind = kinds[(questions.length + attempts) % kinds.length];
    const index = questions.length + 1;
    const question =
      kind === "speed"
        ? speedQuestion(t, rng, index, meta, pokedexById)
        : kind === "lead"
          ? leadQuestion(t, rng, index, meta, pokedexById)
          : kind === "type"
            ? typeQuestion(t, rng, index)
            : kind === "nature"
              ? natureQuestion(t, rng, index)
              : kind === "stat_points"
                ? statPointsQuestion(t, rng, index)
                : clauseQuestion(t, rng, index);
    attempts += 1;
    if (question && !questions.some((entry) => entry.prompt === question.prompt)) {
      questions.push(question);
    }
  }
  return questions.slice(0, count);
}

export function practiceKinds(): PracticeKind[] {
  return ["type", "speed", "lead", "nature", "stat_points", "clause"];
}

export function natureChoices(): Nature[] {
  return [...ALL_NATURES];
}
