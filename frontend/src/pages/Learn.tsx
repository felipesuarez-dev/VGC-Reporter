import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CalendarDays,
  Check,
  ChevronRight,
  GraduationCap,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { Format, Nature, Pokemon, Team, TeamMember, TopTeam } from "../lib/types";
import { ALL_TYPES, canonicalSpeciesId, emptyTeamMember } from "../lib/types";
import { evsToStatPoints } from "../lib/champions";
import {
  LEARN_GUIDES,
  LEARN_GLOSSARY,
  learnLanguage,
  type LearnGuide,
} from "../lib/learnContent";
import { useDashboardStore } from "../stores/dashboardStore";
import { useTeamBuilder } from "../stores/teamBuilderStore";
import { useTypeLabStore } from "../stores/typeLabStore";
import { useModalBack } from "../hooks/useModalBack";
import { TypeBadge } from "../components/pokemon/TypeBadge";
import { MiniTeam } from "../components/pokemon/MiniTeam";
import { PokemonSprite } from "../components/pokemon/PokemonSprite";
import { defensiveMultiplier, weaknessesOf } from "../lib/typeChart";
import { typeLabel } from "../lib/labels";
import { useIsMobile } from "../hooks/useIsMobile";
import { cn } from "../lib/cn";

function asTeam(top: TopTeam, format: Format): Team {
  const valid = top.members.filter((member) => member.species.trim().length > 0);
  const members: TeamMember[] = Array.from({ length: 6 }, (_, index) => {
    const member = valid[index];
    if (!member) return emptyTeamMember();
    const evs = member.evs
      ? { ...member.evs }
      : { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    return {
      species: member.species,
      item: member.item ?? null,
      ability: member.ability ?? null,
      nature: (member.nature as Nature | null) ?? null,
      tera_type: null,
      moves: (member.moves ?? []).filter(Boolean),
      evs,
      stat_points: evsToStatPoints(evs),
      level: 50,
      gender: null,
      shiny: false,
      nickname: null,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    };
  });
  return {
    id: null,
    name: top.player ? `${top.player} - ${top.tournament}` : top.tournament,
    format,
    build_mode: "champions",
    notes: null,
    members,
    created_at: null,
    updated_at: null,
  };
}

function daySeed(): number {
  const now = new Date();
  return Number(
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}`,
  );
}

export function Learn() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const format = useDashboardStore((s) => s.format);
  const lang = learnLanguage(i18n.language);
  const guides = LEARN_GUIDES[lang];
  const glossary = LEARN_GLOSSARY[lang];
  const setTypeLabOpen = useTypeLabStore((s) => s.setOpen);
  const setPendingImport = useTeamBuilder((s) => s.setPendingImport);
  const [selectedGuide, setSelectedGuide] = useState<LearnGuide | null>(null);
  const [query, setQuery] = useState("");
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("vgc-learn-progress") ?? "{}");
    } catch {
      return {};
    }
  });
  const markDone = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    localStorage.setItem("vgc-learn-progress", JSON.stringify(next));
  };

  const meta = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
    staleTime: 5 * 60 * 1000,
  });
  const pokedex = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
    staleTime: 60 * 60 * 1000,
  });
  const topTeams = useQuery({
    queryKey: queryKeys.topTeams(format, 6),
    queryFn: () => ipc.getTopTeams(format, 6),
    staleTime: 30 * 60 * 1000,
  });
  const bySpecies = useMemo(() => {
    const map = new Map<string, NonNullable<typeof pokedex.data>[number]>();
    for (const pokemon of pokedex.data ?? []) {
      map.set(canonicalSpeciesId(pokemon.name), pokemon);
    }
    return map;
  }, [pokedex.data]);

  const starters = (topTeams.data?.teams ?? []).filter(
    (team) => team.members.filter((member) => member.species).length >= 4,
  ).slice(0, 3);
  const threats = (meta.data?.pokemon ?? []).slice(0, 5);
  const filteredGlossary = glossary.filter((entry) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      entry.term.toLowerCase().includes(needle) ||
      entry.definition.toLowerCase().includes(needle)
    );
  });

  const loadStarter = (team: TopTeam) => {
    setPendingImport(asTeam(team, format));
    navigate("/team-builder");
  };

  const completed = Object.values(done).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <header
        className="relative overflow-hidden rounded-2xl border p-5 sm:p-7"
        style={{
          borderColor: "var(--border)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 85%, transparent), transparent 60%)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              <GraduationCap size={12} /> {t("learn.eyebrow")}
            </span>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
              {t("learn.title")}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("learn.subtitle")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={() => {
                  const first = document.getElementById("learn-guides");
                  first?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <BookOpen size={13} className="mr-1" />
                {t("learn.start_guides")}
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setTypeLabOpen(true)}
              >
                <GridIcon /> {t("learn.open_types")}
              </button>
            </div>
          </div>
          <div
            className="w-full rounded-xl border p-3 sm:w-64"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "color-mix(in srgb, var(--bg) 55%, transparent)",
            }}
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
              <span style={{ color: "var(--text-dim)" }}>{t("learn.progress")}</span>
              <span style={{ color: "var(--accent)" }}>
                {completed}/{guides.length}
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(completed / Math.max(1, guides.length)) * 100}%`,
                  backgroundColor: "var(--accent)",
                }}
              />
            </div>
            <div className="mt-3 space-y-1">
              {guides.slice(0, 3).map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => markDone(guide.id)}
                  className="flex w-full items-center gap-2 text-left text-[11px]"
                  style={{ color: done[guide.id] ? "var(--accent)" : "var(--text-muted)" }}
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                    style={{
                      borderColor: done[guide.id] ? "var(--accent)" : "var(--border)",
                    }}
                  >
                    {done[guide.id] && <Check size={10} />}
                  </span>
                  <span className="truncate">{guide.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section>
        <SectionTitle icon={<Trophy size={15} />} title={t("learn.starters_title")} hint={t("learn.starters_hint")} />
        {topTeams.isLoading && <p className="text-xs" style={{ color: "var(--text-dim)" }}>{t("common.loading")}</p>}
        {!topTeams.isLoading && starters.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>{t("learn.starters_empty")}</p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          {starters.map((team) => (
            <article key={`${team.tournament}-${team.player ?? ""}`} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{team.tournament}</h3>
                  <p className="truncate text-[10px]" style={{ color: "var(--text-dim)" }}>
                    {team.player ?? t("learn.community")} · {team.record ?? t("learn.no_record")}
                  </p>
                </div>
                <span className="rounded-full px-1.5 py-0.5 text-[9px] uppercase" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                  {team.provider ?? "team"}
                </span>
              </div>
              <MiniTeam
                members={team.members.map((member) => ({
                  species: member.species,
                  sprite_url: member.sprite_url,
                  sprite_fallback_url: member.sprite_fallback_url,
                  home_sprite_url: member.home_sprite_url,
                  item: member.item,
                  ability: member.ability,
                  tera_type: member.tera_type,
                  nature: member.nature,
                  moves: member.moves,
                }))}
                cols={6}
                size={34}
              />
              <button type="button" className="btn-ghost mt-auto text-xs" onClick={() => loadStarter(team)}>
                <ArrowRight size={12} className="mr-1" />
                {t("learn.load_builder")}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DailyQuiz threats={threats} bySpecies={bySpecies} />
        <ThreatBoard threats={threats} bySpecies={bySpecies} />
      </section>

      <section id="learn-guides">
        <SectionTitle icon={<BookOpen size={15} />} title={t("learn.guides_title")} hint={t("learn.guides_hint")} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guides.map((guide) => (
            <button
              key={guide.id}
              type="button"
              className="card text-left transition hover:border-[var(--accent)]"
              onClick={() => setSelectedGuide(guide)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full px-1.5 py-0.5 text-[9px] uppercase" style={{ backgroundColor: "var(--bg-elev-strong)", color: "var(--text-muted)" }}>
                  {t(`learn.level_${guide.level}`)}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>{guide.minutes} min</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{guide.title}</h3>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{guide.summary}</p>
              <span className="mt-3 inline-flex items-center text-[11px]" style={{ color: "var(--accent)" }}>
                {t("learn.read_guide")} <ChevronRight size={12} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <SectionTitle icon={<Sparkles size={15} />} title={t("learn.glossary_title")} hint={t("learn.glossary_hint")} />
        <div className="relative mb-3">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dim)" }} />
          <input
            className="input h-9 w-full pl-8 text-xs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("learn.search_glossary")}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {filteredGlossary.map((entry) => (
            <div key={entry.term} className="rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs font-semibold">{entry.term}</div>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>{entry.definition}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={<GraduationCap size={15} />} title={t("learn.tools_title")} hint={t("learn.tools_hint")} />
        <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-3 xl:grid-cols-6")}>
          <ToolButton icon={<GridIcon />} label={t("type_lab.title")} onClick={() => setTypeLabOpen(true)} />
          <ToolButton icon={<Swords size={16} />} label={t("nav.team_builder")} onClick={() => navigate("/team-builder")} />
          <ToolButton icon={<Calculator size={16} />} label={t("nav.damage_calc")} onClick={() => navigate("/damage-calc")} />
          <ToolButton icon={<Shield size={16} />} label={t("nav.dashboard")} onClick={() => navigate("/dashboard")} />
          <ToolButton icon={<Trophy size={16} />} label={t("nav.top_teams")} onClick={() => navigate("/top-teams")} />
          <ToolButton icon={<CalendarDays size={16} />} label={t("learn.calendar_hint")} onClick={() => navigate("/dashboard")} />
        </div>
      </section>

      <GuideModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} />
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>{hint}</p>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors hover:border-[var(--accent)]"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elev)" }}
      onClick={onClick}
    >
      <span style={{ color: "var(--accent)" }}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function DailyQuiz({
  threats,
  bySpecies,
}: {
  threats: { species: string; usage_percent: number }[];
  bySpecies: Map<string, Pokemon>;
}) {
  const { t, i18n } = useTranslation();
  const seed = daySeed();
  const [mode, setMode] = useState<"type" | "speed" | "lead">("type");
  const [answer, setAnswer] = useState<string | null>(null);
  const [streak, setStreak] = useState(() =>
    Number(localStorage.getItem("vgc-learn-streak") ?? "0"),
  );

  const typeQuestion = useMemo(() => {
    const types = ALL_TYPES.filter((type) => type !== "Stellar");
    const defender = types[seed % types.length];
    const correct = types.filter((type) => defensiveMultiplier([defender], type) >= 2);
    const wrong = types.filter((type) => defensiveMultiplier([defender], type) < 2);
    const correctType = correct[(seed >> 2) % Math.max(1, correct.length)] ?? types[0];
    const options = [
      correctType,
      ...wrong.slice((seed >> 3) % Math.max(1, wrong.length - 2), (seed >> 3) % Math.max(1, wrong.length - 2) + 3),
    ].filter((value, index, all) => all.indexOf(value) === index).slice(0, 4);
    while (options.length < 4) {
      const candidate = types[(seed + options.length * 7) % types.length];
      if (!options.includes(candidate)) options.push(candidate);
    }
    return {
      prompt: t("learn.quiz_question", { type: typeLabel(t, defender) }),
      correct: correctType,
      correctLabel: typeLabel(t, correctType),
      options: options.map((type) => ({ value: type, label: typeLabel(t, type) })),
      hint: null as string | null,
    };
  }, [seed, t]);

  const speedQuestion = useMemo(() => {
    const known = threats
      .map((threat) => bySpecies.get(canonicalSpeciesId(threat.species)))
      .filter((pokemon): pokemon is Pokemon => Boolean(pokemon?.base_stats));
    const unique = known.filter(
      (pokemon, index) => known.findIndex((entry) => entry.id === pokemon.id) === index,
    );
    if (unique.length < 2) return null;
    let first = unique[seed % unique.length];
    let second = unique[(seed + 3) % unique.length];
    if (first.id === second.id) second = unique[(unique.indexOf(first) + 1) % unique.length];
    if (first.id === second.id || first.base_stats.spe === second.base_stats.spe) {
      const pair = unique
        .flatMap((a, i) => unique.slice(i + 1).map((b) => [a, b] as const))
        .find(([a, b]) => a.base_stats.spe !== b.base_stats.spe);
      if (!pair) return null;
      [first, second] = pair;
    }
    const faster = first.base_stats.spe > second.base_stats.spe ? first : second;
    return {
      prompt: t("learn.quiz_speed_question", { a: first.name, b: second.name }),
      correct: faster.name,
      correctLabel: faster.name,
      options: [
        { value: first.name, label: first.name },
        { value: second.name, label: second.name },
      ],
      hint: t("learn.quiz_speed_hint", {
        a: first.name,
        aSpeed: first.base_stats.spe,
        b: second.name,
        bSpeed: second.base_stats.spe,
      }),
    };
  }, [bySpecies, seed, t, threats]);

  const leadQuestion = useMemo(() => {
    const known = threats
      .map((threat) => bySpecies.get(canonicalSpeciesId(threat.species)))
      .filter((pokemon): pokemon is Pokemon => Boolean(pokemon?.types?.length));
    const unique = known.filter(
      (pokemon, index) => known.findIndex((entry) => entry.id === pokemon.id) === index,
    );
    if (unique.length < 4) return null;
    const threat = unique[seed % unique.length];
    const pool = unique.filter((pokemon) => pokemon.id !== threat.id);
    const picks: Pokemon[] = [];
    for (let offset = 0; picks.length < 3 && offset < pool.length; offset += 1) {
      const candidate = pool[(seed + offset * 2 + 1) % pool.length];
      if (!picks.some((entry) => entry.id === candidate.id)) picks.push(candidate);
    }
    if (picks.length < 3) return null;
    const score = (candidate: Pokemon) =>
      threat.types.reduce(
        (total, attacking) => total + defensiveMultiplier(candidate.types, attacking),
        0,
      );
    const winner = [...picks].sort(
      (a, b) => score(a) - score(b) || b.base_stats.spe - a.base_stats.spe,
    )[0];
    return {
      prompt: t("learn.quiz_lead_question", { threat: threat.name }),
      correct: winner.name,
      correctLabel: winner.name,
      options: picks.map((pokemon) => ({ value: pokemon.name, label: pokemon.name })),
      hint: t("learn.quiz_lead_hint", {
        answer: winner.name,
        threat: threat.name,
        types: threat.types.map((type) => typeLabel(t, type)).join(" / "),
      }),
    };
  }, [bySpecies, seed, t, threats]);

  const question =
    mode === "type" ? typeQuestion : mode === "speed" ? speedQuestion : leadQuestion;
  const result = answer && question ? answer === question.correct : null;

  const pick = (value: string) => {
    if (answer || !question) return;
    setAnswer(value);
    if (value === question.correct) {
      const next = streak + 1;
      setStreak(next);
      localStorage.setItem("vgc-learn-streak", String(next));
    } else {
      setStreak(0);
      localStorage.setItem("vgc-learn-streak", "0");
    }
  };

  const chooseMode = (next: "type" | "speed" | "lead") => {
    setMode(next);
    setAnswer(null);
  };

  return (
    <section className="card">
      <SectionTitle icon={<Sparkles size={15} />} title={t("learn.quiz_title")} hint={t("learn.quiz_hint")} />
      <div className="mb-3 flex flex-wrap gap-1">
        {(["type", "speed", "lead"] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            className="rounded-md px-2 py-1 text-[10px] font-medium"
            style={{
              backgroundColor: mode === entry ? "var(--accent-soft)" : "transparent",
              color: mode === entry ? "var(--accent)" : "var(--text-muted)",
            }}
            onClick={() => chooseMode(entry)}
          >
            {t(`learn.quiz_mode_${entry}`)}
          </button>
        ))}
      </div>
      {!question ? (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("learn.quiz_not_enough")}
        </p>
      ) : (
        <>
          <p className="text-sm">{question.prompt}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {question.options.map((option) => {
              const isCorrect = answer && option.value === question.correct;
              const isWrong = answer === option.value && option.value !== question.correct;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => pick(option.value)}
                  className="rounded-lg border px-2 py-2 text-xs font-medium"
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
          {answer && (
            <p className="mt-3 text-xs" style={{ color: result ? "var(--success)" : "var(--danger)" }}>
              {result
                ? t("learn.quiz_correct")
                : t("learn.quiz_wrong_answer", { answer: question.correctLabel })}
              {" · "}
              {t("learn.streak", { count: streak })}
            </p>
          )}
          {answer && question.hint && (
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
              {question.hint}
            </p>
          )}
        </>
      )}
      <p className="mt-2 text-[10px]" style={{ color: "var(--text-dim)" }}>
        {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date())}
      </p>
    </section>
  );
}

function ThreatBoard({
  threats,
  bySpecies,
}: {
  threats: { species: string; usage_percent: number; sprite_url: string; sprite_fallback_url?: string | null; home_sprite_url?: string | null }[];
  bySpecies: Map<string, Pick<Pokemon, "name" | "types">>;
}) {
  const { t } = useTranslation();
  return (
    <section className="card">
      <SectionTitle icon={<Swords size={15} />} title={t("learn.threats_title")} hint={t("learn.threats_hint")} />
      <div className="space-y-2">
        {threats.map((threat) => {
          const pokemon = bySpecies.get(canonicalSpeciesId(threat.species));
          const weak = pokemon ? weaknessesOf(pokemon.types).slice(0, 4) : [];
          return (
            <div key={threat.species} className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
              <PokemonSprite
                url={threat.sprite_url}
                fallbackUrl={threat.sprite_fallback_url ?? null}
                homeUrl={threat.home_sprite_url ?? null}
                name={threat.species}
                size={32}
                variant="pixel"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold">{threat.species}</span>
                  <span className="text-[10px]" style={{ color: "var(--accent)" }}>{threat.usage_percent.toFixed(1)}%</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {weak.map((entry) => <TypeBadge key={entry.type} type={entry.type} />)}
                </div>
              </div>
            </div>
          );
        })}
        {threats.length === 0 && <p className="text-xs" style={{ color: "var(--text-dim)" }}>{t("common.loading")}</p>}
      </div>
    </section>
  );
}

function GuideModal({ guide, onClose }: { guide: LearnGuide | null; onClose: () => void }) {
  const { t } = useTranslation();
  useModalBack(Boolean(guide), onClose);
  if (!guide) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div
        className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-5 shadow-2xl"
        style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded p-1"
          style={{ color: "var(--text-muted)" }}
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={16} />
        </button>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          {t(`learn.level_${guide.level}`)} · {guide.minutes} min
        </span>
        <h2 className="mt-1 text-xl font-bold">{guide.title}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{guide.summary}</p>
        <div className="mt-4 space-y-3">
          {guide.sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-sm font-semibold">{section.heading}</h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
