import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import {
  ALL_TYPES,
  generationOf,
  type Pokemon,
  type PokemonType,
} from "../lib/types";
import { PokemonCard } from "../components/pokemon/PokemonCard";
import { PokemonDetailModal } from "../components/pokemon/PokemonDetailModal";
import { SearchSelect } from "../components/ui/SearchSelect";
import { MultiTypeSelect } from "../components/ui/MultiTypeSelect";
import { typeLabel } from "../lib/labels";
import { defensiveMultiplier, offensiveCoverage } from "../lib/typeChart";
import { cn } from "../lib/cn";
import { useDashboardStore } from "../stores/dashboardStore";
import { usePokedexStore, type PokedexSort } from "../stores/pokedexStore";
import { useLocalize } from "../hooks/useTranslations";
import { useLearnsetsIndex } from "../hooks/useLearnsetsIndex";
import { useMoveSummary } from "../hooks/useMoveCatalog";
import { MoveCategoryIcon } from "../components/pokemon/MoveCategoryIcon";
import { TypeBadge } from "../components/pokemon/TypeBadge";

const ALL_GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function canonicalKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SORTS: { value: PokedexSort; key: string }[] = [
  { value: "usage", key: "pokedex.sort_usage" },
  { value: "generation", key: "pokedex.sort_generation" },
  { value: "alphabetical", key: "pokedex.sort_alphabetical" },
];

export function Pokedex() {
  const { t } = useTranslation();
  const localize = useLocalize();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PokemonType | "">("");
  const [ability, setAbility] = useState<string | null>(null);
  const [move, setMove] = useState<string | null>(null);
  const [generation, setGeneration] = useState<number | "">("");
  const [weakAgainst, setWeakAgainst] = useState<PokemonType[]>([]);
  const [strongAgainst, setStrongAgainst] = useState<PokemonType[]>([]);
  const moveSummary = useMoveSummary();
  const sort = usePokedexStore((s) => s.sort);
  const setSort = usePokedexStore((s) => s.setSort);
  const scrollY = usePokedexStore((s) => s.scrollY);
  const setScrollY = usePokedexStore((s) => s.setScrollY);
  const format = useDashboardStore((s) => s.format);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.pokedex.search(query, type || undefined),
    queryFn: () =>
      ipc.searchPokemon(query || undefined, (type || undefined) as PokemonType | undefined),
  });

  const { data: meta } = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
  });

  const { data: allMoves = [] } = useQuery({
    queryKey: queryKeys.moves.all,
    queryFn: () => ipc.listMoves(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: learnsetsIndex } = useLearnsetsIndex();

  useEffect(() => {
    if (scrollY > 0) {
      window.scrollTo({ top: scrollY });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setScrollY]);

  const usageMap = useMemo(() => {
    const m = new Map<string, number>();
    if (meta) {
      for (const p of meta.pokemon) {
        m.set(canonicalKey(p.species), p.usage_percent);
      }
    }
    return m;
  }, [meta]);

  const allAbilities = useMemo(() => {
    const set = new Set<string>();
    for (const p of data ?? []) {
      for (const a of p.abilities) set.add(a);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const speciesLearningMove = useMemo(() => {
    if (!move || !learnsetsIndex) return null;
    const moveId = canonicalKey(move);
    const list = learnsetsIndex[moveId];
    if (!list) return new Set<string>();
    return new Set(list);
  }, [move, learnsetsIndex]);

  const filtered = useMemo(() => {
    const list = data ?? [];
    return list.filter((p) => {
      if (ability && !p.abilities.includes(ability)) return false;
      if (speciesLearningMove && !speciesLearningMove.has(p.id)) return false;
      if (generation !== "" && generationOf(p.num) !== generation) return false;
      if (weakAgainst.length > 0) {
        const anyWeak = weakAgainst.some(
          (ty) => defensiveMultiplier(p.types, ty) > 1,
        );
        if (!anyWeak) return false;
      }
      if (strongAgainst.length > 0) {
        const coverage = offensiveCoverage(p.types).weakTo;
        const anyStrong = strongAgainst.some((ty) => coverage.includes(ty));
        if (!anyStrong) return false;
      }
      return true;
    });
  }, [data, ability, speciesLearningMove, generation, weakAgainst, strongAgainst]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "alphabetical") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "usage") {
      list.sort((a, b) => {
        const ua = usageMap.get(canonicalKey(a.name)) ?? -1;
        const ub = usageMap.get(canonicalKey(b.name)) ?? -1;
        if (ub !== ua) return ub - ua;
        return a.name.localeCompare(b.name);
      });
    } else {
      list.sort((a, b) => a.num - b.num || a.name.localeCompare(b.name));
    }
    return list;
  }, [filtered, sort, usageMap]);

  const grouped = useMemo(() => {
    if (sort !== "generation") return null;
    const groups = new Map<number, Pokemon[]>();
    for (const p of sorted) {
      const gen = generationOf(p.num);
      if (!groups.has(gen)) groups.set(gen, []);
      groups.get(gen)!.push(p);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [sorted, sort]);

  const hasActiveFilter =
    query ||
    type ||
    ability ||
    move ||
    generation !== "" ||
    weakAgainst.length > 0 ||
    strongAgainst.length > 0;

  const clearAll = () => {
    setQuery("");
    setType("");
    setAbility(null);
    setMove(null);
    setGeneration("");
    setWeakAgainst([]);
    setStrongAgainst([]);
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("pokedex.title")}</h1>
      </header>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">{t("pokedex.filter_name")}</label>
            <input
              className="input mt-1"
              placeholder={t("pokedex.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("pokedex.filter_type")}</label>
            <select
              className="input mt-1"
              value={type}
              onChange={(e) => setType(e.target.value as PokemonType | "")}
            >
              <option value="">{t("common.all_types")}</option>
              {ALL_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(t, ty)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("pokedex.filter_generation")}</label>
            <select
              className="input mt-1"
              value={generation}
              onChange={(e) =>
                setGeneration(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">{t("pokedex.filter_generation_placeholder")}</option>
              {ALL_GENERATIONS.map((g) => (
                <option key={g} value={g}>
                  {t("pokedex.generation_label", { n: g })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("pokedex.filter_ability")}</label>
            <SearchSelect<string>
              value={ability}
              options={allAbilities}
              onChange={(a) => setAbility(a)}
              getOptionLabel={(a) => localize("ability", a)}
              placeholder={t("pokedex.filter_ability_placeholder")}
              className="mt-1"
            />
          </div>
          <div>
            <label className="label">{t("pokedex.filter_move")}</label>
            <SearchSelect<string>
              value={move}
              options={allMoves}
              onChange={(m) => setMove(m)}
              getOptionLabel={(m) => localize("move", m)}
              placeholder={t("pokedex.filter_move_placeholder")}
              renderOption={(m) => {
                const s = moveSummary(m);
                return (
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{localize("move", m)}</span>
                    {s && (
                      <>
                        <TypeBadge type={s.type_} />
                        <MoveCategoryIcon category={s.category} />
                      </>
                    )}
                  </span>
                );
              }}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <label className="label">{t("pokedex.filter_weak_against")}</label>
          <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-dim)" }}>
            {t("pokedex.filter_weak_against_help")}
          </p>
          <div className="mt-2">
            <MultiTypeSelect
              value={weakAgainst}
              onChange={setWeakAgainst}
              excludeStellar
            />
          </div>
        </div>

        <div>
          <label className="label">{t("pokedex.filter_strong_against")}</label>
          <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-dim)" }}>
            {t("pokedex.filter_strong_against_help")}
          </p>
          <div className="mt-2">
            <MultiTypeSelect
              value={strongAgainst}
              onChange={setStrongAgainst}
              excludeStellar
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="label">{t("pokedex.sort_title")}</label>
            <div
              role="tablist"
              aria-label={t("pokedex.sort")}
              className="mt-1 flex overflow-hidden rounded-lg border border-[var(--border)]"
            >
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="tab"
                  aria-selected={sort === s.value}
                  onClick={() => setSort(s.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition",
                    sort === s.value
                      ? "text-white"
                      : "hover:bg-[var(--bg-elev-strong)]",
                  )}
                  style={
                    sort === s.value
                      ? { backgroundColor: "var(--accent)" }
                      : {
                          backgroundColor: "var(--bg)",
                          color: "var(--text-muted)",
                        }
                  }
                >
                  {t(s.key)}
                </button>
              ))}
            </div>
          </div>
          {hasActiveFilter && (
            <button type="button" className="btn-ghost text-xs" onClick={clearAll}>
              {t("pokedex.clear_filters")}
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("common.loading")}
        </div>
      )}
      {isError && (
        <div className="card" style={{ color: "var(--danger)" }}>
          {t("common.error")}
        </div>
      )}
      {data && sorted.length === 0 && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("common.empty")}
        </div>
      )}

      {grouped ? (
        <div className="space-y-6">
          {grouped.map(([gen, list]) => (
            <section key={gen}>
              <h2
                className="mb-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {t("pokedex.gen_header", { n: gen })}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {list.map((p) => (
                  <PokemonCard
                    key={p.id}
                    pokemon={p}
                    usage={usageMap.get(canonicalKey(p.name))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {sorted.map((p) => (
            <PokemonCard key={p.id} pokemon={p} usage={usageMap.get(canonicalKey(p.name))} />
          ))}
        </div>
      )}

      <PokemonDetailModal />
    </div>
  );
}
