import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Check,
  ExternalLink,
  Grid2x2,
  LayoutGrid,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { formatDate, formatDateTime } from "../lib/formatDate";
import { formatLabel } from "../lib/labels";
import { type ChampionsTournament } from "../lib/types";
import { UsageBarChart, type UsageBarItem } from "../components/charts/UsageBarChart";
import { UsageGridView } from "../components/charts/UsageGridView";
import { UsageTreemap } from "../components/charts/UsageTreemap";
import { cn } from "../lib/cn";
import { TopList } from "../components/charts/TopList";
import { TrendingCard } from "../components/charts/TrendingCard";
import { FormatSelector } from "../components/ui/FormatSelector";
import { XCard } from "../components/dashboard/XCard";
import { TournamentStandingsDrawer } from "../components/tournament/TournamentStandingsDrawer";
import { ChampionsSearchHits } from "../components/tournament/ChampionsSearchHits";
import { SourcesChip } from "../components/layout/SourcesChip";
import { SearchTextInput } from "../components/filters/SearchTextInput";
import { useDashboardStore } from "../stores/dashboardStore";
import { usePokedexStore } from "../stores/pokedexStore";
import { useLongLoadingHint } from "../hooks/useLoadingHint";
import { useIsMobile } from "../hooks/useIsMobile";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/layout/PullToRefreshIndicator";

function canonicalSpeciesId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const EXTERNAL_SITES: { name: string; url: string }[] = [
  { name: "Labmaus", url: "https://labmaus.net/" },
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
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const format = useDashboardStore((s) => s.format);
  const favoriteFormat = useDashboardStore((s) => s.favoriteFormat);
  const setFormat = useDashboardStore((s) => s.setFormat);
  const setFavoriteFormat = useDashboardStore((s) => s.setFavoriteFormat);
  const topPokemonView = useDashboardStore((s) => s.topPokemonView);
  const setTopPokemonView = useDashboardStore((s) => s.setTopPokemonView);
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
  const TOURNAMENT_INITIAL = 10;
  const TOURNAMENT_PAGE = 10;
  const [tournamentVisible, setTournamentVisible] = useState(TOURNAMENT_INITIAL);
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(tournamentSearch.trim()), 250);
    return () => clearTimeout(handle);
  }, [tournamentSearch]);
  const searchQuery = debouncedSearch.length >= 3 ? debouncedSearch : "";
  const { data: searchHits, isFetching: searchFetching } = useQuery({
    queryKey: queryKeys.championsSearch(format, searchQuery),
    queryFn: () => ipc.searchChampions(searchQuery, format, 40),
    enabled: searchQuery.length >= 3,
    staleTime: 60_000,
  });
  const tournamentLimit = tournamentVisible;
  const POKE_INITIAL = 10;
  const POKE_PAGE = 10;
  const [pokeVisible, setPokeVisible] = useState(POKE_INITIAL);
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
  });
  const { data: championsReportRaw, isFetching: championsFetching } = useQuery({
    queryKey: queryKeys.championsReport(format, tournamentLimit),
    queryFn: () => ipc.listChampionsTournaments(format, tournamentLimit),
    staleTime: 30 * 60 * 1000,
  });
  const championsReport = championsReportRaw
    ? {
        ...championsReportRaw,
        tournaments: championsReportRaw.tournaments.filter(
          (t) =>
            !(t.name ?? "").toUpperCase().includes("TCG") &&
            !(t.format ?? "").toUpperCase().includes("TCG"),
        ),
      }
    : championsReportRaw;

  const allPokemon = data?.pokemon ?? [];
  const topPokemon = allPokemon.slice(0, pokeVisible);
  const chartPokemon: UsageBarItem[] = topPokemon.map((p) => ({
    name: p.species,
    usage_percent: p.usage_percent,
    count: p.count,
    sprite_url: p.sprite_url,
    sprite_fallback_url: p.sprite_fallback_url,
    home_sprite_url: p.home_sprite_url,
    id: p.species,
  }));
  const handleBarClick = (item: UsageBarItem) => {
    openSpecies(String(item.id));
  };
  const showMetaSkeleton = isFetching && !data;
  const isLoadingMeta = isLoading || showMetaSkeleton;
  const showMetaHint = useLongLoadingHint(isLoadingMeta);
  const showMetaPatience = useLongLoadingHint(isLoadingMeta, 60_000);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const wasFetchingRef = useRef(false);
  useEffect(() => {
    if (wasFetchingRef.current && !isFetching) {
      setJustRefreshed(true);
      const id = window.setTimeout(() => setJustRefreshed(false), 2000);
      return () => window.clearTimeout(id);
    }
    wasFetchingRef.current = isFetching;
  }, [isFetching]);
  const topItems = data?.top_items ?? [];
  const topMoves = data?.top_moves ?? [];
  const topAbilities = data?.top_abilities ?? [];

  const isMobile = useIsMobile();
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: queryKeys.meta(format) });
    qc.invalidateQueries({ queryKey: queryKeys.championsReport(format, tournamentLimit) });
  };
  const ptrState = usePullToRefresh(refreshAll, isMobile);

  return (
    <div>
      {isMobile && <PullToRefreshIndicator state={ptrState} />}
      <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <div className="flex items-center gap-2">
          <FormatSelector
            value={format}
            favorite={favoriteFormat}
            onChange={setFormat}
            onFavoriteChange={setFavoriteFormat}
            className="w-72"
          />
          {!isMobile && (
            <button
              className="btn-ghost"
              disabled={isFetching}
              onClick={() =>
                qc.invalidateQueries({
                  queryKey: queryKeys.meta(format),
                })
              }
            >
              {isFetching ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : justRefreshed ? (
                <Check
                  size={14}
                  className="mr-1"
                  style={{ color: "var(--accent)" }}
                />
              ) : (
                <RefreshCw size={14} className="mr-1" />
              )}
              {isFetching
                ? t("dashboard.refreshing")
                : justRefreshed
                  ? t("dashboard.refreshed")
                  : t("dashboard.refresh")}
            </button>
          )}
        </div>
      </header>
      {data && (
        <div className="-mt-4 flex items-center gap-2">
          <SourcesChip
            tournamentsUsed={data.tournaments_used}
            battlesAnalyzed={data.battles_analyzed}
            fromDate={data.from_date}
            toDate={data.to_date}
            totalEntries={data.total_entries}
          />
        </div>
      )}

      {isLoadingMeta && (
        <MetaSkeleton
          label={t("common.loading")}
          showHint={showMetaHint}
          showPatience={showMetaPatience}
        />
      )}
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_pokemon")}
              </h2>
              <div
                className="flex overflow-hidden rounded-md border"
                style={{ borderColor: "var(--border)" }}
                role="tablist"
                aria-label={t("dashboard.chart_view")}
              >
                {(
                  [
                    { id: "bar", Icon: BarChart3, label: t("dashboard.chart_view_bar") },
                    { id: "grid", Icon: LayoutGrid, label: t("dashboard.chart_view_grid") },
                    { id: "treemap", Icon: Grid2x2, label: t("dashboard.chart_view_treemap") },
                  ] as const
                ).map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={topPokemonView === id}
                    title={label}
                    onClick={() => setTopPokemonView(id)}
                    className={cn(
                      "flex h-7 w-8 items-center justify-center transition-colors",
                      topPokemonView === id
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)]",
                    )}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
            {topPokemonView === "bar" && (
              <UsageBarChart
                data={chartPokemon}
                height={Math.max(440, topPokemon.length * 48)}
                onBarClick={handleBarClick}
              />
            )}
            {topPokemonView === "grid" && (
              <UsageGridView
                data={chartPokemon}
                onItemClick={handleBarClick}
              />
            )}
            {topPokemonView === "treemap" && (
              <UsageTreemap
                data={chartPokemon}
                height={Math.max(360, Math.min(560, topPokemon.length * 28))}
                onItemClick={handleBarClick}
              />
            )}
            {(allPokemon.length > pokeVisible || pokeVisible > POKE_INITIAL) && (
              <div className="mt-3 flex justify-center gap-2">
                {allPokemon.length > pokeVisible && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setPokeVisible((n) => n + POKE_PAGE)}
                  >
                    {t("common.see_more")}
                  </button>
                )}
                {pokeVisible > POKE_INITIAL && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setPokeVisible(POKE_INITIAL)}
                  >
                    {t("common.see_less")}
                  </button>
                )}
              </div>
            )}
          </section>

          <TrendingCard format={format} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_items")}
              </h2>
              <TopList data={topItems} limit={10} entityKind="item" />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_moves")}
              </h2>
              <TopList data={topMoves} limit={10} entityKind="move" />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_abilities")}
              </h2>
              <TopList data={topAbilities} limit={10} entityKind="ability" />
            </div>
          </section>

        </>
      )}

      <section className="card">
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {format === "regulation-i"
            ? t("dashboard.recent_tournaments")
            : t("dashboard.champions_report")}
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
          {t("dashboard.tournaments_for_format", {
            format: formatLabel(t, format),
          })}
        </p>
        {championsReport && championsReport.tournaments.length > 0 && (
          <div className="mb-2">
            <SearchTextInput
              value={tournamentSearch}
              onChange={setTournamentSearch}
              placeholder={t("common.filter_search_tournament")}
            />
          </div>
        )}
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
            {championsReport.tournaments
              .filter((tour) => {
                const q = tournamentSearch.trim().toLowerCase();
                if (!q) return true;
                const name = (tour.name ?? "").toLowerCase();
                const champ = (tour.champion_name ?? "").toLowerCase();
                return name.includes(q) || champ.includes(q);
              })
              .map((tour) => (
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
                    {tour.date && <span>{formatDateTime(tour.date, i18n.language)}</span>}
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
        {searchQuery.length >= 3 && (
          <ChampionsSearchHits
            hits={searchHits ?? []}
            isFetching={searchFetching}
            onOpenTournament={setSelectedTournament}
          />
        )}
        {championsReport && championsReport.tournaments.length > 0 && (
          <div className="mt-2 flex justify-center gap-2">
            {championsReport.tournaments.length >= tournamentVisible && (
              <button
                className="btn-ghost text-xs"
                onClick={() =>
                  setTournamentVisible((n) => n + TOURNAMENT_PAGE)
                }
              >
                {t("dashboard.view_more")}
              </button>
            )}
            {tournamentVisible > TOURNAMENT_INITIAL && (
              <button
                className="btn-ghost text-xs"
                onClick={() => setTournamentVisible(TOURNAMENT_INITIAL)}
              >
                {t("dashboard.view_less")}
              </button>
            )}
          </div>
        )}
      </section>

      <UpcomingTournamentsSection />

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

      <TournamentStandingsDrawer
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
      />
      </div>
    </div>
  );
}

function MetaSkeleton({
  label,
  showHint,
  showPatience,
}: {
  label: string;
  showHint?: boolean;
  showPatience?: boolean;
}) {
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
          {showHint && (
            <div
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--text-dim)" }}
            >
              {t("dashboard.loading_long_hint")}
            </div>
          )}
          {showPatience && (
            <div
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--text-dim)" }}
            >
              {t("dashboard.loading_patience_hint")}
            </div>
          )}
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

function UpcomingTournamentsSection() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.upcomingTournaments(),
    queryFn: () => ipc.listUpcomingTournaments(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
  const events = data ?? [];
  return (
    <section className="card">
      <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
        {t("upcoming.title")}
      </h2>
      <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
        {t("upcoming.window")}
      </p>
      {isLoading && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("common.loading")}
        </p>
      )}
      {isError && (
        <div
          className="flex flex-col gap-2 text-xs"
          style={{ color: "var(--danger)" }}
        >
          <span>
            {t("common.error_with_detail", {
              detail: (error as Error)?.message ?? "unknown",
            })}
          </span>
          <button
            type="button"
            className="btn-ghost self-start text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {t("common.retry")}
          </button>
        </div>
      )}
      {!isLoading && !isError && events.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("upcoming.empty")}
        </p>
      )}
      {events.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                  {ev.name}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <span>{formatDate(ev.date, i18n.language)}</span>
                  {ev.players != null && (
                    <span> · {ev.players} {t("dashboard.players")}</span>
                  )}
                  {ev.region && <span> · {ev.region}</span>}
                </div>
              </div>
              <button
                className="btn-ghost shrink-0 text-xs"
                onClick={() => openExternal(ev.url)}
              >
                <ExternalLink size={12} className="mr-1 inline" />
                {t("upcoming.open")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
