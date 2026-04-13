import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { type ChampionsTournament, type PokemonUsage } from "../lib/types";
import { UsageBarChart } from "../components/charts/UsageBarChart";
import { TopList } from "../components/charts/TopList";
import { PokemonSprite } from "../components/pokemon/PokemonSprite";
import { PokemonMetaDrawer } from "../components/pokemon/PokemonMetaDrawer";
import { FormatSelector } from "../components/ui/FormatSelector";
import { TwitterCard } from "../components/dashboard/TwitterCard";
import { TournamentStandingsDrawer } from "../components/tournament/TournamentStandingsDrawer";
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
  const favoriteFormat = useDashboardStore((s) => s.favoriteFormat);
  const setFormat = useDashboardStore((s) => s.setFormat);
  const setFavoriteFormat = useDashboardStore((s) => s.setFavoriteFormat);
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (format !== favoriteFormat) setFormat(favoriteFormat);
  }, [favoriteFormat, format, setFormat]);
  const [selected, setSelected] = useState<PokemonUsage | null>(null);
  const [selectedTournament, setSelectedTournament] =
    useState<ChampionsTournament | null>(null);
  const [tournamentExpanded, setTournamentExpanded] = useState(false);
  const tournamentLimit = tournamentExpanded ? 20 : 10;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
  });
  const { data: championsReport } = useQuery({
    queryKey: queryKeys.championsReport(tournamentLimit),
    queryFn: () => ipc.listChampionsTournaments(tournamentLimit),
    staleTime: 30 * 60 * 1000,
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
          <FormatSelector
            value={format}
            favorite={favoriteFormat}
            onChange={setFormat}
            onFavoriteChange={setFavoriteFormat}
            className="w-72"
          />
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
        <div className="card text-slate-400">{t("dashboard.empty_format")}</div>
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
          {t("dashboard.champions_report")}
        </h2>
        {!championsReport && (
          <p className="text-xs text-slate-500">{t("common.loading")}</p>
        )}
        {championsReport && championsReport.tournaments.length === 0 && (
          <p className="text-xs text-slate-500">{t("common.empty")}</p>
        )}
        {championsReport && championsReport.tournaments.length > 0 && (
          <ul className="divide-y divide-slate-800">
            {championsReport.tournaments.map((tour) => (
              <li
                key={tour.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-100">
                    {tour.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {tour.date && <span>{tour.date}</span>}
                    {tour.players != null && (
                      <span> · {tour.players} {t("dashboard.players")}</span>
                    )}
                    {tour.format && <span> · {tour.format}</span>}
                  </div>
                </div>
                <button
                  className="btn-ghost shrink-0 text-xs"
                  onClick={() => setSelectedTournament(tour)}
                >
                  {t("dashboard.view_standings")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {championsReport &&
          !tournamentExpanded &&
          championsReport.tournaments.length >= 10 && (
            <button
              className="btn-ghost mt-2 w-full text-xs"
              onClick={() => setTournamentExpanded(true)}
            >
              {t("dashboard.view_more")}
            </button>
          )}
      </section>

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">
          {t("dashboard.external_sources")}
        </h2>
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <TwitterCard handle="VGCdata" url="https://x.com/VGCdata" />
          <TwitterCard handle="VGChampStats" url="https://x.com/VGChampStats" />
        </div>
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
      <TournamentStandingsDrawer
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
      />
    </div>
  );
}
