import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Layers,
  Lightbulb,
  Package,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  GLOSSARY_CATEGORIES,
  type CoreArchetype,
  type GlossaryCategory,
  type GlossaryEntry,
} from "../../lib/learnContent";
import { buildArchetypeTeam } from "../../lib/learn/coreTeams";
import {
  dailyPractice,
  type PracticeQuestion,
} from "../../lib/learn/practice";
import type { LearnedMetaInsights } from "../../lib/learn/insights";
import type { Pokemon, PokemonUsage, Team } from "../../lib/types";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useModalBack } from "../../hooks/useModalBack";
import { openExternal } from "../../lib/openExternal";
import { SectionTitle } from "./SectionTitle";

export function GlossaryModal({
  entries,
  open,
  onClose,
}: {
  entries: GlossaryEntry[];
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GlossaryCategory | "all">("all");
  useModalBack(open, onClose);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory("all");
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  const needle = query.trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    if (!needle) return true;
    return (
      entry.term.toLowerCase().includes(needle) ||
      entry.definition.toLowerCase().includes(needle) ||
      (entry.example ?? "").toLowerCase().includes(needle)
    );
  });
  const groups = new Map<string, GlossaryEntry[]>();
  for (const entry of filtered) {
    const letter = entry.term.normalize("NFD")[0]?.toUpperCase() ?? "#";
    const list = groups.get(letter) ?? [];
    list.push(entry);
    groups.set(letter, list);
  }
  const letters = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("learn.glossary_title")}
      className="fixed inset-0 z-[72] flex items-center justify-center bg-black/65 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color: "var(--accent)" }} />
            <div>
              <h2 className="text-sm font-semibold">{t("learn.glossary_title")}</h2>
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("learn.glossary_all_count", { count: entries.length })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded p-1"
            style={{ color: "var(--text-muted)" }}
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </button>
        </header>
        <div className="space-y-2 border-b px-4 py-2" style={{ borderColor: "var(--border)" }}>
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-dim)" }}
            />
            <input
              className="input h-9 w-full pl-8 text-xs"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("learn.search_glossary")}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", ...GLOSSARY_CATEGORIES] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{
                  borderColor: category === entry ? "var(--accent)" : "var(--border)",
                  backgroundColor: category === entry ? "var(--accent-soft)" : "transparent",
                  color: category === entry ? "var(--accent)" : "var(--text-muted)",
                }}
                onClick={() => setCategory(entry)}
              >
                {entry === "all"
                  ? t("learn.glossary_category_all")
                  : t(`learn.glossary_category_${entry}`)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1" aria-label={t("learn.glossary_index")}>
            {letters.map((letter) => (
              <button
                key={letter}
                type="button"
                className="flex h-6 min-w-6 items-center justify-center rounded border px-1 text-[10px] font-semibold"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                onClick={() =>
                  document
                    .getElementById(`glossary-letter-${letter}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-scroll min-h-0 flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("learn.glossary_no_results")}
            </p>
          ) : (
            <div className="space-y-4">
              {letters.map((letter) => (
                <section key={letter} id={`glossary-letter-${letter}`}>
                  <h3
                    className="sticky top-0 z-10 mb-1 bg-[var(--bg-elev)] py-1 text-xs font-bold"
                    style={{ color: "var(--accent)" }}
                  >
                    {letter}
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(groups.get(letter) ?? []).map((entry) => (
                      <div
                        key={entry.id}
                        className="space-y-1.5 rounded-lg border p-2.5"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold">{entry.term}</span>
                          <span className="shrink-0 text-[8px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                            {t(`learn.glossary_category_${entry.category}`)}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          {entry.definition}
                        </p>
                        {entry.example && (
                          <p
                            className="rounded-md px-2 py-1 text-[10px] leading-relaxed"
                            style={{ backgroundColor: "var(--bg)", color: "var(--text-muted)" }}
                          >
                            <strong style={{ color: "var(--text)" }}>{t("learn.glossary_example")}:</strong>{" "}
                            {entry.example}
                          </p>
                        )}
                        {(entry.sources?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap items-center gap-1 text-[9px]" style={{ color: "var(--text-dim)" }}>
                            <span>{t("learn.glossary_source")}:</span>
                            {entry.sources!.map((source) => (
                              <button
                                key={source.url}
                                type="button"
                                className="underline-offset-2 hover:underline"
                                style={{ color: "var(--accent)" }}
                                onClick={() => void openExternal(source.url)}
                              >
                                {source.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DailyPractice({
  meta,
  pokedex,
  onStreakChange,
}: {
  meta: PokemonUsage[];
  pokedex: Pokemon[];
  onStreakChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const dateKey = new Date().toISOString().slice(0, 10);
  const questions = useMemo(
    () => dailyPractice({ t, dateKey, meta, pokedex, count: 10 }),
    [t, dateKey, meta, pokedex],
  );
  const storageKey = `vgc-learn-practice-${dateKey}`;
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  });
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(() =>
    Number(localStorage.getItem("vgc-learn-streak") ?? "0"),
  );
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);
  useEffect(() => {
    if (index >= questions.length) setIndex(Math.max(0, questions.length - 1));
  }, [index, questions.length]);

  const current: PracticeQuestion | undefined = questions[index];
  const answered = current ? answers[index] : undefined;
  const correctCount = questions.filter(
    (question, position) => answers[position] === question.correct,
  ).length;

  const pick = (value: string) => {
    if (!current || answered) return;
    const correct = value === current.correct;
    setAnswers((previous) => ({ ...previous, [index]: value }));
    const next = correct ? streak + 1 : 0;
    setStreak(next);
    onStreakChange(next);
    localStorage.setItem("vgc-learn-streak", String(next));
  };

  const reset = () => {
    setAnswers({});
    setIndex(0);
    localStorage.removeItem(storageKey);
  };

  return (
    <section className="card flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <SectionTitle icon={<Sparkles size={15} />} title={t("learn.quiz_title")} hint={t("learn.quiz_hint")} />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
            {t("learn.practice_score", { correct: correctCount, total: questions.length })}
          </span>
          <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
            {t("learn.streak", { count: streak })}
          </span>
        </div>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--bg-elev-strong)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${(correctCount / Math.max(1, questions.length)) * 100}%`, backgroundColor: "var(--accent)" }}
          />
        </div>
        <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>
          {questions.length > 0 ? `${index + 1}/${questions.length}` : "0/0"}
        </span>
      </div>
      {!current ? (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("learn.quiz_not_enough")}
        </p>
      ) : (
        <>
          <p className="text-sm leading-snug">{current.prompt}</p>
          <div className="mt-3 grid gap-2">
            {current.options.map((option) => {
              const isCorrect = answered && option.value === current.correct;
              const isWrong = answered === option.value && option.value !== current.correct;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => pick(option.value)}
                  className="rounded-lg border px-2.5 py-2 text-left text-xs font-medium"
                  style={{
                    borderColor: isCorrect ? "var(--success)" : isWrong ? "var(--danger)" : "var(--border)",
                    backgroundColor: isCorrect
                      ? "color-mix(in srgb, var(--success) 15%, transparent)"
                      : isWrong
                        ? "color-mix(in srgb, var(--danger) 15%, transparent)"
                        : "var(--bg)",
                    color: "var(--text)",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="mt-3 rounded-lg border p-2.5 text-[11px]" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
              <p className="font-semibold" style={{ color: answered === current.correct ? "var(--success)" : "var(--danger)" }}>
                {answered === current.correct
                  ? t("learn.quiz_correct")
                  : t("learn.quiz_wrong_answer", {
                      answer:
                        current.options.find((entry) => entry.value === current.correct)?.label ??
                        current.correct,
                    })}
              </p>
              <p className="mt-1" style={{ color: "var(--text-muted)" }}>
                {current.explanation}
              </p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="btn-ghost text-[11px]"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
            >
              {t("learn.practice_previous")}
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost text-[11px]" onClick={reset}>
                {t("learn.practice_reset")}
              </button>
              {index < questions.length - 1 ? (
                <button
                  type="button"
                  className="btn-primary text-[11px]"
                  onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
                  disabled={!answered}
                >
                  {t("learn.practice_next")}
                </button>
              ) : (
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                  {t("learn.practice_done", { correct: correctCount, total: questions.length })}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function TriviaPanel({
  items,
}: {
  items: { id: string; statement: string; answer: boolean; explanation: string }[];
}) {
  const { t } = useTranslation();
  const day = Math.floor(Date.now() / 86_400_000);
  const selected = [
    items[day % items.length],
    items[(day + 7) % items.length],
    items[(day + 14) % items.length],
  ];
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const correct = selected.filter((item) => answers[item.id] === item.answer).length;
  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <SectionTitle icon={<Lightbulb size={15} />} title={t("learn.trivia_title")} hint={t("learn.trivia_hint")} />
        <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          {t("learn.trivia_score", { correct, total: selected.length })}
        </span>
      </div>
      <div className="space-y-2">
        {selected.map((item) => {
          const answered = answers[item.id];
          const isCorrect = answered === item.answer;
          return (
            <div key={item.id} className="rounded-lg border px-2.5 py-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
              <p className="text-[11px] leading-snug">{item.statement}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {[true, false].map((value) => {
                  const chosen = answered === value;
                  const good = chosen && value === item.answer;
                  const bad = chosen && value !== item.answer;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      disabled={answered !== undefined}
                      onClick={() => setAnswers((current) => ({ ...current, [item.id]: value }))}
                      className="rounded-md border px-2 py-0.5 text-[9px] font-medium disabled:cursor-default"
                      style={{
                        borderColor: good ? "var(--success)" : bad ? "var(--danger)" : "var(--border)",
                        backgroundColor: good
                          ? "color-mix(in srgb, var(--success) 16%, transparent)"
                          : bad
                            ? "color-mix(in srgb, var(--danger) 16%, transparent)"
                            : "transparent",
                        color: good ? "var(--success)" : bad ? "var(--danger)" : "var(--text-muted)",
                      }}
                    >
                      {value ? t("learn.trivia_true") : t("learn.trivia_false")}
                    </button>
                  );
                })}
                {answered !== undefined && (
                  <span className="text-[9px] font-medium" style={{ color: isCorrect ? "var(--success)" : "var(--danger)" }}>
                    {isCorrect ? t("learn.trivia_correct") : t("learn.trivia_wrong")}
                  </span>
                )}
              </div>
              {answered !== undefined && (
                <p className="mt-1 text-[9px] leading-snug" style={{ color: "var(--text-dim)" }}>
                  {item.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MetaInsights({
  insights,
  localize,
}: {
  insights: LearnedMetaInsights;
  localize: (kind: "ability" | "move" | "item", name: string) => string;
}) {
  const { t } = useTranslation();
  const cards = [
    {
      id: "winrate",
      icon: <Trophy size={15} />,
      label: t("learn.insight_winrate"),
      value: insights.bestWin?.name ?? "—",
      detail: insights.bestWin
        ? t("learn.insight_winrate_detail", {
            win: insights.bestWin.winRate.toFixed(1),
            sample: insights.bestWin.sample,
            sources: insights.bestWin.sources,
          })
        : t("learn.insight_no_data"),
      confidence: insights.bestWin?.confidence,
    },
    {
      id: "topcut",
      icon: <Target size={15} />,
      label: t("learn.insight_topcut"),
      value: insights.bestTopCut?.name ?? "—",
      detail: insights.bestTopCut
        ? t("learn.insight_topcut_detail", {
            rate: insights.bestTopCut.topCutRate.toFixed(1),
            sample: insights.bestTopCut.sample,
            sources: insights.bestTopCut.sources,
          })
        : t("learn.insight_no_data"),
      confidence: insights.bestTopCut?.confidence,
    },
    {
      id: "emerging",
      icon: <TrendingUp size={15} />,
      label: t("learn.insight_emerging"),
      value: insights.emerging?.name ?? "—",
      detail: insights.emerging
        ? t("learn.insight_emerging_detail", {
            change: insights.emerging.change.toFixed(1),
            usage: insights.emerging.usage.toFixed(1),
            sample: insights.emerging.sample,
          })
        : t("learn.insight_no_data"),
      confidence: insights.emerging?.confidence,
    },
    {
      id: "antimeta",
      icon: <Shield size={15} />,
      label: t("learn.insight_antimeta"),
      value: insights.antiMeta?.name ?? "—",
      detail: insights.antiMeta
        ? t("learn.insight_antimeta_detail", {
            win: insights.antiMeta.winRate.toFixed(1),
            usage: insights.antiMeta.usage.toFixed(1),
            sample: insights.antiMeta.sample,
          })
        : t("learn.insight_no_data"),
      confidence: insights.antiMeta?.confidence,
    },
    {
      id: "speed",
      icon: <Zap size={15} />,
      label: t("learn.insight_speed"),
      value: insights.speedControl ? localize("move", insights.speedControl.name) : "—",
      detail: insights.speedControl
        ? t("learn.insight_speed_detail", {
            percent: insights.speedControl.usage.toFixed(1),
            sample: insights.speedControl.sample,
          })
        : t("learn.insight_no_data"),
      confidence: insights.speedControl?.confidence,
    },
    {
      id: "item",
      icon: <Package size={15} />,
      label: t("learn.insight_item"),
      value: insights.keyItem ? localize("item", insights.keyItem.name) : "—",
      detail: insights.keyItem
        ? t("learn.insight_item_detail", {
            percent: insights.keyItem.usage.toFixed(1),
            sample: insights.keyItem.sample,
          })
        : t("learn.insight_no_data"),
      confidence: insights.keyItem?.confidence,
    },
  ];
  return (
    <section>
      <SectionTitle icon={<TrendingUp size={15} />} title={t("learn.insights_title")} hint={t("learn.insights_hint")} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.id} className="card relative overflow-hidden">
            <div className="pointer-events-none absolute -right-2 -top-3 opacity-10" style={{ color: "var(--accent)" }}>
              <span className="[&>svg]:h-16 [&>svg]:w-16">{card.icon}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
              <span style={{ color: "var(--accent)" }}>{card.icon}</span>
              {card.label}
            </div>
            <div className="mt-2 truncate text-base font-bold">{card.value}</div>
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
              {card.detail}
            </p>
            {card.confidence && (
              <span className="mt-2 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide" style={{ backgroundColor: "var(--bg-elev-strong)", color: "var(--text-dim)" }}>
                {t(`learn.confidence_${card.confidence}`)}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ArchetypeCores({
  archetypes,
  meta,
  pokedex,
  onTry,
}: {
  archetypes: CoreArchetype[];
  meta: PokemonUsage[];
  pokedex: Pokemon[];
  onTry: (team: Team) => void;
}) {
  const { t } = useTranslation();
  const format = useDashboardStore((s) => s.format);
  const [expanded, setExpanded] = useState<string | null>(null);
  const teams = useMemo(() => {
    const map = new Map<string, Team | null>();
    for (const core of archetypes) {
      map.set(core.id, buildArchetypeTeam(core.id, core.name, format, meta, pokedex));
    }
    return map;
  }, [archetypes, format, meta, pokedex]);

  return (
    <section>
      <SectionTitle icon={<Layers size={15} />} title={t("learn.archetypes_title")} hint={t("learn.archetypes_hint")} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {archetypes.map((core) => {
          const team = teams.get(core.id) ?? null;
          const open = expanded === core.id;
          return (
            <article key={core.id} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{core.name}</h3>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {core.summary}
                  </p>
                </div>
                <span className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                  {core.icon}
                </span>
              </div>
              {open && (
                <div className="space-y-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <p><strong style={{ color: "var(--text)" }}>{t("learn.archetype_roles")}:</strong> {core.roles}</p>
                  <p><strong style={{ color: "var(--text)" }}>{t("learn.archetype_condition")}:</strong> {core.winCondition}</p>
                  <p><strong style={{ color: "var(--text)" }}>{t("learn.archetype_play")}:</strong> {core.howToPlay}</p>
                  <p><strong style={{ color: "var(--text)" }}>{t("learn.archetype_variants")}:</strong> {core.variants}</p>
                </div>
              )}
              <div className="mt-auto flex items-center justify-between gap-2">
                <button type="button" className="btn-ghost text-[10px]" onClick={() => setExpanded(open ? null : core.id)}>
                  {open ? t("learn.archetype_hide") : t("learn.archetype_details")}
                </button>
                <button
                  type="button"
                  className="btn-primary text-[10px]"
                  disabled={!team}
                  onClick={() => team && onTry(team)}
                  title={!team ? t("learn.archetype_no_sample") : undefined}
                >
                  {t("learn.core_try")}
                </button>
              </div>
              {!team && (
                <p className="text-[9px]" style={{ color: "var(--text-dim)" }}>
                  {t("learn.archetype_no_sample")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
