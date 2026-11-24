import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  GraduationCap,
  Layers,
  Lightbulb,
  Package,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type {
  Format,
  Nature,
  Pokemon,
  PokemonUsage,
  Team,
  TeamMember,
  TeammateUsage,
  TopTeam,
  UsageEntry,
} from "../lib/types";
import { ALL_TYPES, ALL_NATURES, canonicalSpeciesId, emptyTeamMember } from "../lib/types";
import { evsToStatPoints, statPointsToEvs } from "../lib/champions";
import {
  GLOSSARY_CATEGORIES,
  LEARN_CORE_ARCHETYPES,
  LEARN_GUIDES,
  LEARN_GLOSSARY,
  LEARN_TRIVIA,
  learnLanguage,
  type GlossaryCategory,
  type LearnGuide,
} from "../lib/learnContent";
import { computeMetaInsights } from "../lib/learn/insights";
import {
  ArchetypeCores,
  DailyPractice,
  GlossaryModal,
  MetaInsights,
  TriviaPanel,
} from "../components/learn/LearnSections";
import { SectionTitle } from "../components/learn/SectionTitle";
import { PanelLoading } from "../components/ui/PanelLoading";
import { useDashboardStore } from "../stores/dashboardStore";
import { useTeamBuilder } from "../stores/teamBuilderStore";
import { useModalBack } from "../hooks/useModalBack";
import { openExternal } from "../lib/openExternal";
import { CheckboxField } from "../components/ui/FormControls";
import { MiniTeam } from "../components/pokemon/MiniTeam";
import { PokemonSprite } from "../components/pokemon/PokemonSprite";
import { defensiveMultiplier } from "../lib/typeChart";
import { typeLabel } from "../lib/labels";
import { useLocalize } from "../hooks/useTranslations";
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

export function Learn() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const localize = useLocalize();
  const format = useDashboardStore((s) => s.format);
  const lang = learnLanguage(i18n.language);
  const guides = LEARN_GUIDES[lang];
  const glossary = LEARN_GLOSSARY[lang];
  const trivia = LEARN_TRIVIA[lang];
  const archetypes = LEARN_CORE_ARCHETYPES[lang];
  const setPendingImport = useTeamBuilder((s) => s.setPendingImport);
  const [selectedGuide, setSelectedGuide] = useState<LearnGuide | null>(null);
  const [glossaryQuery, setGlossaryQuery] = useState("");
  const [glossaryCategory, setGlossaryCategory] = useState<
    GlossaryCategory | "all"
  >("all");
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [starterVisible, setStarterVisible] = useState(3);
  const [refreshing, setRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("vgc-learn-progress") ?? "{}");
    } catch {
      return {};
    }
  });
  const [streak, setStreak] = useState(() =>
    Number(localStorage.getItem("vgc-learn-streak") ?? "0"),
  );
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
    queryKey: queryKeys.topTeams(format, 30),
    queryFn: () => ipc.getTopTeams(format, 30),
    staleTime: 30 * 60 * 1000,
  });
  const trending = useQuery({
    queryKey: queryKeys.trending(format),
    queryFn: () => ipc.getTrending(format),
    staleTime: 30 * 60 * 1000,
  });
  const refreshLearn = async () => {
    setRefreshing(true);
    setJustRefreshed(false);
    try {
      await Promise.all([
        meta.refetch(),
        pokedex.refetch(),
        topTeams.refetch(),
        trending.refetch(),
      ]);
      setJustRefreshed(true);
      window.setTimeout(() => setJustRefreshed(false), 2000);
    } finally {
      setRefreshing(false);
    }
  };
  const bySpecies = useMemo(() => {
    const map = new Map<string, NonNullable<typeof pokedex.data>[number]>();
    for (const pokemon of pokedex.data ?? []) {
      map.set(canonicalSpeciesId(pokemon.name), pokemon);
    }
    return map;
  }, [pokedex.data]);

  const starters = (topTeams.data?.teams ?? []).filter(
    (team) => team.members.filter((member) => member.species).length >= 4,
  );
  const shownStarters = starters.slice(0, starterVisible);

  const usageById = useMemo(() => {
    const map = new Map<string, PokemonUsage>();
    for (const pokemon of meta.data?.pokemon ?? []) {
      map.set(canonicalSpeciesId(pokemon.species), pokemon);
    }
    return map;
  }, [meta.data]);

  const cores = useMemo(() => {
    const seen = new Set<string>();
    const out: { members: PokemonUsage[]; matePercent: number }[] = [];
    for (const anchor of (meta.data?.pokemon ?? []).slice(0, 10)) {
      for (const mate of anchor.top_teammates ?? []) {
        const mateUsage = usageById.get(canonicalSpeciesId(mate.name));
        if (!mateUsage) continue;
        const third = (mateUsage.top_teammates ?? []).find((candidate) => {
          const id = canonicalSpeciesId(candidate.name);
          return (
            id !== canonicalSpeciesId(anchor.species) && usageById.has(id)
          );
        });
        const members = [anchor, mateUsage];
        if (third) members.push(usageById.get(canonicalSpeciesId(third.name))!);
        const key = members
          .map((member) => canonicalSpeciesId(member.species))
          .sort()
          .join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ members, matePercent: mate.usage_percent });
        break;
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [meta.data, usageById]);

  const insights = useMemo(
    () => computeMetaInsights(meta.data, trending.data),
    [meta.data, trending.data],
  );

  const filteredGlossary = useMemo(() => {
    const needle = glossaryQuery.trim().toLowerCase();
    return glossary.filter((entry) => {
      if (glossaryCategory !== "all" && entry.category !== glossaryCategory) {
        return false;
      }
      if (!needle) return true;
      return (
        entry.term.toLowerCase().includes(needle) ||
        entry.definition.toLowerCase().includes(needle)
      );
    });
  }, [glossary, glossaryCategory, glossaryQuery]);

  const loadStarter = (team: TopTeam) => {
    setPendingImport(asTeam(team, format));
    navigate("/team-builder");
  };

  const loadCore = (core: { members: PokemonUsage[]; matePercent: number }) => {
    const members: TeamMember[] = Array.from({ length: 6 }, (_, index) => {
      const usage = core.members[index];
      if (!usage) return emptyTeamMember();
      const base = bySpecies.get(canonicalSpeciesId(usage.species));
      const atk = base?.base_stats.atk ?? 0;
      const spa = base?.base_stats.spa ?? 0;
      const points = {
        hp: 32,
        atk: atk >= spa ? 2 : 0,
        def: 0,
        spa: spa > atk ? 2 : 0,
        spd: 0,
        spe: 32,
      };
      const natureName = usage.top_natures?.[0]?.name?.toLowerCase();
      const nature =
        ALL_NATURES.find((entry) => entry.toLowerCase() === natureName) ?? null;
      const candidates = usage.common_movesets?.[0]?.moves?.length
        ? usage.common_movesets[0].moves
        : usage.top_moves.map((move) => move.name);
      return {
        species: usage.species,
        item: usage.top_items?.[0]?.name ?? null,
        ability: usage.top_abilities?.[0]?.name ?? null,
        nature,
        tera_type: null,
        moves: [...new Set(candidates)].slice(0, 4),
        evs: statPointsToEvs(points),
        stat_points: points,
        level: 50,
        gender: null,
        shiny: false,
        nickname: null,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      };
    });
    setPendingImport({
      id: null,
      name: `Core: ${core.members.map((member) => member.species).join(" + ")}`,
      format,
      build_mode: "champions",
      notes: t("learn.core_notes"),
      members,
      created_at: null,
      updated_at: null,
    });
    navigate("/team-builder");
  };

  const completed = Object.values(done).filter(Boolean).length;
  const progressPct = Math.round((completed / Math.max(1, guides.length)) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-ghost h-8 text-[11px]"
          onClick={() => void refreshLearn()}
          disabled={refreshing}
          title={t("learn.refresh")}
        >
          {refreshing ? (
            <RefreshCw size={13} className="mr-1 animate-spin" />
          ) : justRefreshed ? (
            <Check size={13} className="mr-1" style={{ color: "var(--accent)" }} />
          ) : (
            <RefreshCw size={13} className="mr-1" />
          )}
          {refreshing
            ? t("learn.refreshing")
            : justRefreshed
              ? t("learn.refreshed")
              : t("learn.refresh")}
        </button>
      </div>
      <header
        className="relative overflow-hidden rounded-3xl border p-5 sm:p-8"
        style={{
          borderColor: "var(--border)",
          background:
            "radial-gradient(900px 320px at 100% 0%, color-mix(in srgb, var(--accent) 15%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 70%, transparent), transparent 55%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full opacity-20"
          style={{ backgroundColor: "var(--accent)", filter: "blur(80px)" }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                <GraduationCap size={12} /> {t("learn.eyebrow")}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
                style={{
                  backgroundColor: "var(--bg-elev-strong)",
                  color: "var(--text-muted)",
                }}
              >
                <Layers size={11} />
                {t("learn.cores_count", { count: cores.length + archetypes.length })}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {t("learn.title")}
            </h1>
            <p
              className="mt-2 max-w-xl text-sm leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {t("learn.subtitle")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary group text-xs shadow-lg"
                style={{
                  boxShadow:
                    "0 12px 30px -18px color-mix(in srgb, var(--accent) 80%, transparent)",
                }}
                onClick={() => {
                  const first = document.getElementById("learn-guides");
                  first?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <BookOpen size={14} className="mr-1.5" />
                {t("learn.start_guides")}
                <ArrowRight
                  size={13}
                  className="ml-1 transition-transform group-hover:translate-x-0.5"
                />
              </button>
              <button
                type="button"
                className="btn-ghost border text-xs"
                style={{ borderColor: "var(--border)" }}
                onClick={() => {
                  const coresSection = document.getElementById("learn-cores");
                  coresSection?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                <Layers size={13} />
                <span className="ml-1">{t("learn.see_cores")}</span>
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px]">
              <HeroChip icon={<BookOpen size={11} />} label={t("learn.guides_count", { count: guides.length })} />
              <HeroChip icon={<Trophy size={11} />} label={t("learn.starters_count", { count: starters.length })} />
              <HeroChip icon={<Layers size={11} />} label={t("learn.cores_count", { count: cores.length + archetypes.length })} />
            </div>
          </div>
          <div
            className="w-full rounded-2xl border p-4 sm:w-[19rem]"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "color-mix(in srgb, var(--bg) 60%, transparent)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(var(--accent) ${progressPct}%, var(--bg-elev-strong) ${progressPct}% 100%)`,
                }}
              >
                <div
                  className="grid h-[5.25rem] w-[5.25rem] place-items-center rounded-full"
                  style={{ backgroundColor: "var(--bg-elev)" }}
                >
                  <div className="text-center">
                    <div className="text-xl font-black leading-none">{progressPct}%</div>
                    <div
                      className="mt-1 text-[8px] uppercase tracking-wide"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {t("learn.progress")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">
                  {t("learn.completed_of", {
                    done: completed,
                    total: guides.length,
                  })}
                </div>
                <p
                  className="mt-1 text-[10px] leading-snug"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("learn.progress_hint")}
                </p>
                <div
                  className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  <Flame size={11} />
                  {t("learn.streak", { count: streak })}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {guides.slice(0, 3).map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => markDone(guide.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left text-[11px]"
                  style={{
                    color: done[guide.id] ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                    style={{
                      borderColor: done[guide.id]
                        ? "var(--accent)"
                        : "var(--border)",
                      backgroundColor: done[guide.id]
                        ? "var(--accent-soft)"
                        : "transparent",
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
        {topTeams.isLoading && <PanelLoading variant="cards" rows={3} />}
        {!topTeams.isLoading && starters.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>{t("learn.starters_empty")}</p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          {shownStarters.map((team) => (
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
        {starters.length > starterVisible && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setStarterVisible((value) => value + 6)}
            >
              {t("common.see_more")}
            </button>
            {starters.length > 9 && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setStarterVisible(starters.length)}
              >
                {t("learn.starters_all", { count: starters.length })}
              </button>
            )}
            {starterVisible > 3 && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setStarterVisible(3)}
              >
                {t("common.see_less")}
              </button>
            )}
          </div>
        )}
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <DailyPractice
            meta={meta.data?.pokemon ?? []}
            pokedex={pokedex.data ?? []}
            onStreakChange={setStreak}
          />
          <TriviaPanel items={trivia} />
        </div>
        <MetaCores cores={cores} onLoadCore={loadCore} />
      </section>

      <ArchetypeCores
        archetypes={archetypes}
        meta={meta.data?.pokemon ?? []}
        pokedex={pokedex.data ?? []}
        onTry={(team) => {
          setPendingImport(team);
          navigate("/team-builder");
        }}
      />

      <MetaInsights insights={insights} localize={localize} />

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
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SectionTitle icon={<Sparkles size={15} />} title={t("learn.glossary_title")} hint={t("learn.glossary_hint")} />
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {glossary.length}
          </span>
        </div>
        <div className="relative mb-2">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dim)" }} />
          <input
            className="input h-9 w-full pl-8 text-xs"
            value={glossaryQuery}
            onChange={(event) => setGlossaryQuery(event.target.value)}
            placeholder={t("learn.search_glossary")}
          />
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {(["all", ...GLOSSARY_CATEGORIES] as const).map((category) => (
            <button
              key={category}
              type="button"
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                borderColor:
                  glossaryCategory === category ? "var(--accent)" : "var(--border)",
                backgroundColor:
                  glossaryCategory === category ? "var(--accent-soft)" : "transparent",
                color:
                  glossaryCategory === category ? "var(--accent)" : "var(--text-muted)",
              }}
              onClick={() => setGlossaryCategory(category)}
            >
              {category === "all"
                ? t("learn.glossary_category_all")
                : t(`learn.glossary_category_${category}`)}
            </button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {filteredGlossary.slice(0, 6).map((entry) => (
            <div key={entry.id} className="rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold">{entry.term}</div>
                <span className="shrink-0 text-[8px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                  {t(`learn.glossary_category_${entry.category}`)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>{entry.definition}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-ghost mt-3 w-full justify-center text-xs"
          onClick={() => setGlossaryOpen(true)}
        >
          <BookOpen size={12} className="mr-1" />
          {t("learn.glossary_view_all", { count: filteredGlossary.length })}
        </button>
      </section>

      <GlossaryModal
        entries={glossary}
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />

      <section>
        <SectionTitle icon={<GraduationCap size={15} />} title={t("learn.tools_title")} hint={t("learn.tools_hint")} />
        <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-3 xl:grid-cols-6")}>
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

function HeroChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
        color: "var(--text-muted)",
      }}
    >
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function MetaCores({
  cores,
  onLoadCore,
}: {
  cores: { members: PokemonUsage[]; matePercent: number }[];
  onLoadCore: (core: { members: PokemonUsage[]; matePercent: number }) => void;
}) {
  const { t } = useTranslation();
  const localize = useLocalize();
  return (
    <section id="learn-cores" className="card flex flex-col">
      <SectionTitle
        icon={<Layers size={15} />}
        title={t("learn.cores_title")}
        hint={t("learn.cores_hint")}
      />
      {cores.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("learn.cores_empty")}
        </p>
      ) : (
        <div className="grid flex-1 gap-2">
          {cores.map((core, coreIndex) => (
            <article
              key={core.members.map((member) => member.species).join("-")}
              className="relative overflow-hidden rounded-xl border p-3 transition-colors hover:border-[var(--accent)]"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg)",
              }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("learn.core_rank", {
                    n: coreIndex + 1,
                  })}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{
                    backgroundColor: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  {core.matePercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-end gap-2">
                  {core.members.map((member, index) => (
                    <div key={member.species} className="flex items-center gap-1">
                      {index > 0 && (
                        <Plus
                          size={11}
                          style={{ color: "var(--text-dim)" }}
                          aria-hidden
                        />
                      )}
                      <div className="flex flex-col items-center">
                        <PokemonSprite
                          url={member.sprite_url}
                          fallbackUrl={member.sprite_fallback_url}
                          homeUrl={member.home_sprite_url}
                          name={member.species}
                          size={36}
                          variant="pixel"
                        />
                        <span className="mt-0.5 max-w-[4.4rem] truncate text-[9px] font-semibold">
                          {member.species}
                        </span>
                        {member.top_items?.[0] && (
                          <span
                            className="max-w-[4.4rem] truncate text-[8px]"
                            style={{ color: "var(--text-dim)" }}
                            title={localize("item", member.top_items[0].name)}
                          >
                            {localize("item", member.top_items[0].name)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-primary text-[10px]"
                  onClick={() => onLoadCore(core)}
                  title={t("learn.core_try")}
                >
                  <ArrowUpRight size={11} className="mr-1" />
                  {t("learn.core_try")}
                </button>
              </div>
              <p
                className="mt-2 text-[10px] leading-snug"
                style={{ color: "var(--text-muted)" }}
              >
                {t("learn.core_detail", {
                  anchor: core.members[0]?.species ?? "",
                  mate: core.members[1]?.species ?? "",
                  percent: core.matePercent.toFixed(1),
                })}
              </p>
              <div
                className="mt-2 h-1 overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--bg-elev-strong)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, core.matePercent)}%`,
                    backgroundColor: "var(--accent)",
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="mt-3 text-[10px]" style={{ color: "var(--text-dim)" }}>
        {t("learn.cores_note")}
      </p>
    </section>
  );
}

function GuideModal({ guide, onClose }: { guide: LearnGuide | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  useModalBack(Boolean(guide), onClose);
  useEffect(() => {
    setChecks({});
  }, [guide?.id]);
  if (!guide) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
              {t(`learn.level_${guide.level}`)} · {guide.minutes} min
            </span>
            <h2 className="mt-1 text-xl font-bold">{guide.title}</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{guide.summary}</p>
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
        <div className="modal-scroll min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-3">
            {guide.sections.map((section) => (
              <div key={section.heading}>
                <h3 className="text-sm font-semibold">{section.heading}</h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{section.body}</p>
              </div>
            ))}
          </div>
          {guide.sources.length > 0 && (
            <div
              className="mt-4 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                {t("learn.guide_sources")}
              </h3>
              <ul className="mt-1.5 space-y-1">
                {guide.sources.map((source) => (
                  <li key={source.url}>
                    <button
                      type="button"
                      onClick={() => void openExternal(source.url)}
                      className="inline-flex items-center gap-1 text-[11px] hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      <ArrowUpRight size={11} />
                      {source.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("learn.guide_reviewed", { date: guide.reviewedAt })}
              </p>
            </div>
          )}
          <div
            className="mt-5 rounded-xl border p-3"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
              {t("learn.guide_exercise")}
            </h3>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {t("learn.guide_exercise_body")}
            </p>
            <div className="mt-2 space-y-1.5">
              {guide.sections.slice(0, 3).map((section, index) => (
                <CheckboxField
                  key={section.heading}
                  checked={Boolean(checks[index])}
                  onChange={() =>
                    setChecks((current) => ({ ...current, [index]: !current[index] }))
                  }
                  label={section.heading}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
