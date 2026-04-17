import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { type ChampionsTournament } from "../lib/types";
import { UsageBarChart, type UsageBarItem } from "../components/charts/UsageBarChart";
import { TopList } from "../components/charts/TopList";
import { typeLabel } from "../lib/labels";
import type { PokemonType } from "../lib/types";
import { PokemonSprite } from "../components/pokemon/PokemonSprite";
import { PokemonDetailModal } from "../components/pokemon/PokemonDetailModal";
import { FormatSelector } from "../components/ui/FormatSelector";
import { XCard } from "../components/dashboard/XCard";
import { TournamentStandingsDrawer } from "../components/tournament/TournamentStandingsDrawer";
import { useDashboardStore, type TournamentCount } from "../stores/dashboardStore";
import { usePokedexStore } from "../stores/pokedexStore";
import { useLocalize } from "../hooks/useTranslations";

function canonicalSpeciesId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

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
  const localize = useLocalize();
  const format = useDashboardStore((s) => s.format);
  const favoriteFormat = useDashboardStore((s) => s.favoriteFormat);
  const tournamentCount = useDashboardStore((s) => s.tournamentCount);
  const setFormat = useDashboardStore((s) => s.setFormat);
  const setFavoriteFormat = useDashboardStore((s) => s.setFavoriteFormat);
  const setTournamentCount = useDashboardStore((s) => s.setTournamentCount);
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (format !== favoriteFormat) setFormat(favoriteFormat);
  }, [favoriteFormat, format, setFormat]);
  const openDetail = usePokedexStore((s) => s.openDetail);
  const openSpecies = (species: string) => openDetail(canonicalSpeciesId(species));
  const [selectedTournament, setSelectedTournament] =
    useState<ChampionsTournament | null>(null);
  const [tournamentExpanded, setTournamentExpanded] = useState(false);
  const tournamentLimit = tournamentExpanded ? 20 : 10;
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: queryKeys.meta(format, tournamentCount),
    queryFn: () => ipc.getMetaStats(format, tournamentCount),
  });
  const { data: championsReport, isFetching: championsFetching } = useQuery({
    queryKey: queryKeys.championsReport(format, tournamentLimit),
    queryFn: () => ipc.listChampionsTournaments(format, tournamentLimit),
    staleTime: 30 * 60 * 1000,
  });

  const topPokemon = data?.pokemon.slice(0, 15) ?? [];
  const chartPokemon: UsageBarItem[] = topPokemon.map((p) => ({
    name: p.species,
    usage_percent: p.usage_percent,
    count: p.count,
    sprite_url: p.sprite_url,
    id: p.species,
  }));
  const handleBarClick = (item: UsageBarItem) => {
    openSpecies(String(item.id));
  };
  const showMetaSkeleton = isFetching && !data;
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
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {data.from_date && data.to_date ? (
                <>
                  {t("dashboard.tournaments_range", {
                    count: data.tournaments_used,
                    from: data.from_date,
                    to: data.to_date,
                    source: data.source,
                  })}
                </>
              ) : (
                <>
                  {t("dashboard.tournaments_used")}: {data.tournaments_used} ·{" "}
                  {t("dashboard.total_entries")}: {data.total_entries} ·{" "}
                  {t("common.source")}: {data.source}
                </>
              )}
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
          <select
            className="input w-20 cursor-pointer"
            value={tournamentCount}
            onChange={(e) =>
              setTournamentCount(Number(e.target.value) as TournamentCount)
            }
            title={t("dashboard.tournament_count")}
            aria-label={t("dashboard.tournament_count")}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button
            className="btn-ghost"
            onClick={() =>
              qc.invalidateQueries({
                queryKey: queryKeys.meta(format, tournamentCount),
              })
            }
          >
            <RefreshCw size={14} className="mr-1" />
            {t("dashboard.refresh")}
          </button>
        </div>
      </header>

      {isLoading && <MetaSkeleton label={t("common.loading")} />}
      {showMetaSkeleton && !isLoading && <MetaSkeleton label={t("common.loading")} />}
      {isError && (
        <div className="card text-red-400">
          {t("common.error")}: {(error as Error)?.message ?? "unknown"}
        </div>
      )}
      {data && data.pokemon.length === 0 && !isFetching && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("dashboard.empty_format")}
        </div>
      )}

      {data && data.pokemon.length > 0 && (
        <>
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
              {t("dashboard.top_pokemon")}
            </h2>
            <UsageBarChart
              data={chartPokemon}
              height={380}
              onBarClick={handleBarClick}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_items")}
              </h2>
              <TopList
                data={topItems}
                limit={10}
                labelFor={(n) => localize("item", n)}
              />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_moves")}
              </h2>
              <TopList
                data={topMoves}
                limit={10}
                labelFor={(n) => localize("move", n)}
              />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_abilities")}
              </h2>
              <TopList
                data={topAbilities}
                limit={10}
                labelFor={(n) => localize("ability", n)}
              />
            </div>
          </section>

          {format !== "regulation-m-a" && (
            <section className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_tera")}
              </h2>
              <TopList
                data={topTera}
                limit={10}
                labelFor={(name) => typeLabel(t, name as PokemonType)}
              />
            </section>
          )}

          <section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {topPokemon.map((p) => (
                <button
                  key={p.species}
                  type="button"
                  onClick={() => openSpecies(p.species)}
                  className="card flex flex-col items-center gap-1 text-center transition hover:border-[var(--accent)] hover:bg-[var(--bg-elev-strong)]"
                >
                  <PokemonSprite url={p.sprite_url} name={p.species} size={64} />
                  <div className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    {p.species}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--accent)" }}>
                    {p.usage_percent.toFixed(1)}%
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="card">
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {format === "regulation-m-a"
            ? t("dashboard.champions_report")
            : t("dashboard.recent_tournaments")}
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
          {t("dashboard.tournaments_for_format", { format })}
        </p>
        {(championsFetching || !championsReport) && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("common.loading")}
          </p>
        )}
        {championsReport &&
          !championsFetching &&
          championsReport.tournaments.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("common.empty")}
            </p>
          )}
        {championsReport && championsReport.tournaments.length > 0 && (
          <ul className="divide-y divide-[var(--border)]">
            {championsReport.tournaments.map((tour) => (
              <li
                key={tour.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {tour.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
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
        <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("dashboard.external_sources")}
        </h2>
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <XCard handle="VGCdata" url="https://x.com/VGCdata" />
          <XCard handle="VGChampStats" url="https://x.com/VGChampStats" />
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

      <PokemonDetailModal />
      <TournamentStandingsDrawer
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
      />
    </div>
  );
}

function MetaSkeleton({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div
        className="card flex items-start gap-3"
        style={{ color: "var(--text-muted)" }}
      >
        <RefreshCw size={14} className="mt-0.5 animate-spin" />
        <div>
          <div className="text-sm">{label}</div>
          <div
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--text-dim)" }}
          >
            {t("dashboard.loading_patience")}
          </div>
        </div>
      </div>
      <div className="card">
        <div
          className="mb-3 h-4 w-32 animate-pulse rounded"
          style={{ backgroundColor: "var(--bg-elev-strong)" }}
        />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-6 animate-pulse rounded"
              style={{
                width: `${100 - i * 8}%`,
                backgroundColor: "var(--bg-elev-strong)",
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card">
            <div
              className="mb-3 h-4 w-24 animate-pulse rounded"
              style={{ backgroundColor: "var(--bg-elev-strong)" }}
            />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div
                  key={j}
                  className="h-4 w-full animate-pulse rounded"
                  style={{ backgroundColor: "var(--bg-elev-strong)", opacity: 0.7 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
