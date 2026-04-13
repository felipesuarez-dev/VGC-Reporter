import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { ALL_FORMATS, type Format, type PokemonUsage } from "../lib/types";
import { UsageBarChart } from "../components/charts/UsageBarChart";
import { TopList } from "../components/charts/TopList";
import { PokemonSprite } from "../components/pokemon/PokemonSprite";
import { PokemonMetaDrawer } from "../components/pokemon/PokemonMetaDrawer";
import { useDashboardStore } from "../stores/dashboardStore";

const EXTERNAL_SITES: { name: string; url: string }[] = [
  { name: "Pikalytics", url: "https://www.pikalytics.com/" },
  { name: "Pokebase", url: "https://pokebase.app/pokemon-champions" },
  { name: "Pokemon-Zone", url: "https://pokemon-zone.com/" },
  { name: "Champions Lab", url: "https://championslab.xyz/" },
  { name: "Munchstats", url: "https://munchstats.com/" },
];

async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

export function Dashboard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const format = useDashboardStore((s) => s.format);
  const setFormat = useDashboardStore((s) => s.setFormat);
  const [selected, setSelected] = useState<PokemonUsage | null>(null);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
  });

  const topPokemon = data?.pokemon.slice(0, 15) ?? [];
  const chartPokemon = topPokemon.map((p) => ({
    name: p.species,
    usage_percent: p.usage_percent,
  }));
  const topItems = data?.top_items ?? [];
  const topMoves = data?.top_moves ?? [];
  const topAbilities = data?.top_abilities ?? [];
  const topTera = data?.top_tera ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          {data && (
            <p className="mt-1 text-xs text-slate-400">
              {t("dashboard.tournaments_used")}: {data.tournaments_used} ·{" "}
              {t("dashboard.total_entries")}: {data.total_entries} ·{" "}
              {t("common.source")}: {data.source}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="format-select">
            {t("dashboard.format")}
          </label>
          <select
            id="format-select"
            className="input h-9 text-sm"
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
          >
            {ALL_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            className="btn-ghost"
            onClick={() => qc.invalidateQueries({ queryKey: queryKeys.meta(format) })}
          >
            <RefreshCw size={14} className="mr-1" />
            {t("dashboard.refresh")}
          </button>
        </div>
      </header>

      {isLoading && <div className="card text-slate-400">{t("common.loading")}</div>}
      {isError && (
        <div className="card text-red-400">
          {t("common.error")}: {(error as Error)?.message ?? "unknown"}
        </div>
      )}
      {data && data.pokemon.length === 0 && (
        <div className="card text-slate-400">{t("common.empty")}</div>
      )}

      {data && data.pokemon.length > 0 && (
        <>
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              {t("dashboard.top_pokemon")}
            </h2>
            <UsageBarChart data={chartPokemon} height={380} />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-slate-200">
                {t("dashboard.top_items")}
              </h2>
              <TopList data={topItems} limit={10} />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-slate-200">
                {t("dashboard.top_moves")}
              </h2>
              <TopList data={topMoves} limit={10} />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-slate-200">
                {t("dashboard.top_abilities")}
              </h2>
              <TopList data={topAbilities} limit={10} />
            </div>
          </section>

          <section className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              {t("dashboard.top_tera")}
            </h2>
            <TopList data={topTera} limit={10} />
          </section>

          <section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {topPokemon.map((p) => (
                <button
                  key={p.species}
                  type="button"
                  onClick={() => setSelected(p)}
                  className="card flex flex-col items-center gap-1 text-center transition hover:border-brand-500 hover:bg-slate-800/50"
                >
                  <PokemonSprite url={p.sprite_url} name={p.species} size={64} />
                  <div className="text-xs font-semibold text-slate-100">{p.species}</div>
                  <div className="text-[10px] text-brand-300">
                    {p.usage_percent.toFixed(1)}%
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">
          {t("dashboard.external_sources")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {EXTERNAL_SITES.map((site) => (
            <button
              key={site.name}
              type="button"
              onClick={() => openExternal(site.url)}
              className="btn-ghost flex items-center justify-center gap-1.5 text-xs"
            >
              <ExternalLink size={12} />
              {site.name}
            </button>
          ))}
        </div>
      </section>

      <PokemonMetaDrawer usage={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
