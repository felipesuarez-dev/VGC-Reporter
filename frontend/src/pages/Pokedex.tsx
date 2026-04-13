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
import { cn } from "../lib/cn";
import { useDashboardStore } from "../stores/dashboardStore";
import { usePokedexStore, type PokedexSort } from "../stores/pokedexStore";

const SORTS: { value: PokedexSort; key: string }[] = [
  { value: "generation", key: "pokedex.sort_generation" },
  { value: "alphabetical", key: "pokedex.sort_alphabetical" },
  { value: "usage", key: "pokedex.sort_usage" },
];

export function Pokedex() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PokemonType | "">("");
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
    enabled: sort === "usage",
  });

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
        m.set(p.species.toLowerCase(), p.usage_percent);
      }
    }
    return m;
  }, [meta]);

  const sorted = useMemo(() => {
    const list = [...(data ?? [])];
    if (sort === "alphabetical") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "usage") {
      list.sort((a, b) => {
        const ua = usageMap.get(a.name.toLowerCase()) ?? -1;
        const ub = usageMap.get(b.name.toLowerCase()) ?? -1;
        if (ub !== ua) return ub - ua;
        return a.name.localeCompare(b.name);
      });
    } else {
      list.sort((a, b) => a.num - b.num || a.name.localeCompare(b.name));
    }
    return list;
  }, [data, sort, usageMap]);

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

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("pokedex.title")}</h1>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder={t("pokedex.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input max-w-[10rem]"
          value={type}
          onChange={(e) => setType(e.target.value as PokemonType | "")}
        >
          <option value="">{t("common.all_types")}</option>
          {ALL_TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
        <div
          role="tablist"
          aria-label={t("pokedex.sort")}
          className="ml-auto flex overflow-hidden rounded-lg border border-slate-700"
        >
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="tab"
              aria-selected={sort === s.value}
              onClick={() => setSort(s.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                sort === s.value
                  ? "bg-brand-500 text-white"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800",
              )}
            >
              {t(s.key)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="card text-slate-400">{t("common.loading")}</div>}
      {isError && <div className="card text-red-400">{t("common.error")}</div>}
      {data && data.length === 0 && (
        <div className="card text-slate-400">{t("common.empty")}</div>
      )}

      {grouped ? (
        <div className="space-y-6">
          {grouped.map(([gen, list]) => (
            <section key={gen}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("pokedex.gen_header", { n: gen })}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {list.map((p) => (
                  <PokemonCard key={p.id} pokemon={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {sorted.map((p) => (
            <PokemonCard key={p.id} pokemon={p} />
          ))}
        </div>
      )}
    </div>
  );
}
