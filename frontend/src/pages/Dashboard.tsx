import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  CalendarClock,
  Check,
  ExternalLink,
  Grid2x2,
  Trophy,
  LayoutGrid,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { formatDate, formatDateTime } from "../lib/formatDate";
import { formatLabel } from "../lib/labels";
import { type ChampionsTournament } from "../lib/types";
import { defaultRangeFor } from "../lib/regulations";
import { openExternal } from "../lib/openExternal";
import { UsageBarChart, type UsageBarItem } from "../components/charts/UsageBarChart";
import { UsageGridView } from "../components/charts/UsageGridView";
import { UsageTreemap } from "../components/charts/UsageTreemap";
import { UsageTierList } from "../components/charts/UsageTierList";
import {
  SourceSelector,
  SourceProvenanceChips,
} from "../components/ui/SourceSelector";
import { cn } from "../lib/cn";
import { TopList } from "../components/charts/TopList";
import { buildEntityUsers } from "../lib/entityUsers";
import { TrendingCard } from "../components/charts/TrendingCard";
import { FormatSelector } from "../components/ui/FormatSelector";
import { XCard } from "../components/dashboard/XCard";
import { TournamentStandingsDrawer } from "../components/tournament/TournamentStandingsDrawer";
import { ChampionTeam } from "../components/tournament/ChampionTeam";
import { ChampionsSearchHits } from "../components/tournament/ChampionsSearchHits";
import { SourcesChip } from "../components/layout/SourcesChip";
import { SearchTextInput } from "../components/filters/SearchTextInput";
import { CountryFilter } from "../components/filters/CountryFilter";
import { countryFlag } from "../lib/countryFlag";
import {
  useDashboardStore,
  type DashboardView,
  type MetricsPanelId,
  type RegulationPanelId,
} from "../stores/dashboardStore";
import { useRegulationCatalog, useRegulationStatus } from "../hooks/useRegulationCatalog";
import { usePokedexStore } from "../stores/pokedexStore";
import { useLongLoadingHint } from "../hooks/useLoadingHint";
import { useIsMobile } from "../hooks/useIsMobile";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/layout/PullToRefreshIndicator";
import { DashboardViewTabs } from "../components/dashboard/DashboardViewTabs";
import { RegulationFeed } from "../components/dashboard/RegulationFeed";
import { RegulationInfoView } from "../components/dashboard/RegulationInfoView";
import { UpcomingTournamentsSection } from "../components/dashboard/UpcomingTournamentsSection";
import { PanelOrder, PanelOrderGroup } from "../components/layout/PanelBoard";

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

export function Dashboard() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const format = useDashboardStore((s) => s.format);
  const favoriteFormat = useDashboardStore((s) => s.favoriteFormat);
  const setFormat = useDashboardStore((s) => s.setFormat);
  const setFavoriteFormat = useDashboardStore((s) => s.setFavoriteFormat);
  const topPokemonView = useDashboardStore((s) => s.topPokemonView);
  const sourceFilter = useDashboardStore((s) => s.sourceFilter);
  const setSourceFilter = useDashboardStore((s) => s.setSourceFilter);
  const favoriteSource = useDashboardStore((s) => s.favoriteSource);
  const setFavoriteSource = useDashboardStore((s) => s.setFavoriteSource);
  const setTopPokemonView = useDashboardStore((s) => s.setTopPokemonView);
  const metricsOrder = useDashboardStore((s) => s.metricsOrder);
  const setMetricsOrder = useDashboardStore((s) => s.setMetricsOrder);
  const regulationOrder = useDashboardStore((s) => s.regulationOrder);
  const setRegulationOrder = useDashboardStore((s) => s.setRegulationOrder);
  const openDetail = usePokedexStore((s) => s.openDetail);
  const openSpecies = (species: string) => openDetail(canonicalSpeciesId(species));
  const dashboardView = useDashboardStore((s) => s.dashboardView);
  const setDashboardView = useDashboardStore((s) => s.setDashboardView);
  const [view, setView] = useState<DashboardView>(() => dashboardView);
  const { options: formatOptions, regulations } = useRegulationCatalog();
  const selectedRegulation =
    regulations.find((regulation) => regulation.id === format) ?? null;
  const defaultRange = selectedRegulation
    ? defaultRangeFor(selectedRegulation)
    : null;
  const storedDateRange = useDashboardStore((s) => s.dateRanges[format]);
  const setStoredDateRange = useDashboardStore((s) => s.setDateRange);
  const dateRange = storedDateRange ?? defaultRange;
  const setDateRange = (range: { from: string; to: string } | null) =>
    setStoredDateRange(format, range);
  const isCustomRange =
    Boolean(dateRange && defaultRange) &&
    (dateRange!.from !== defaultRange!.from ||
      dateRange!.to !== defaultRange!.to);
  const todayIso = new Date().toISOString().slice(0, 10);
  const regulationStart =
    selectedRegulation?.start_at.slice(0, 10) ?? todayIso;
  const seasonName = selectedRegulation?.active_season?.name ?? null;
  const [selectedTournament, setSelectedTournament] =
    useState<ChampionsTournament | null>(null);
  const TOURNAMENT_INITIAL = 10;
  const TOURNAMENT_PAGE = 10;
  const [tournamentVisible, setTournamentVisible] = useState(TOURNAMENT_INITIAL);
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [tournamentCountry, setTournamentCountry] = useState<string[]>([]);
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
  /** Below this many analysed teams the Panel warns that the meta is young. */
const THIN_DATA_TEAMS = 200;
const POKE_INITIAL = 10;
  const POKE_PAGE = 10;
  const [pokeVisible, setPokeVisible] = useState(POKE_INITIAL);
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: queryKeys.meta(format, undefined, sourceFilter, dateRange?.from, dateRange?.to),
    queryFn: () =>
      ipc.getMetaStats(
        format,
        undefined,
        sourceFilter,
        dateRange?.from,
        dateRange?.to,
      ),
  });
  const { data: championsReportRaw, isFetching: championsFetching } = useQuery({
    queryKey: queryKeys.championsReport(
      format,
      tournamentLimit,
      dateRange?.from,
      dateRange?.to,
    ),
    queryFn: () =>
      ipc.listChampionsTournaments(
        format,
        tournamentLimit,
        dateRange?.from,
        dateRange?.to,
      ),
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

  const championCountryOptions = useMemo(
    () =>
      [
        ...new Set(
          (championsReport?.tournaments ?? [])
            .map((tournament) => tournament.champion_country?.toUpperCase())
            .filter((country): country is string => Boolean(country)),
        ),
      ].sort(),
    [championsReport],
  );

  const filteredTournaments = useMemo(() => {
    const q = tournamentSearch.trim().toLowerCase();
    return (championsReport?.tournaments ?? []).filter((tour) => {
      if (
        tournamentCountry.length > 0 &&
        (!tour.champion_country ||
          !tournamentCountry.includes(tour.champion_country.toUpperCase()))
      ) {
        return false;
      }
      if (!q) return true;
      const name = (tour.name ?? "").toLowerCase();
      const champ = (tour.champion_name ?? "").toLowerCase();
      return name.includes(q) || champ.includes(q);
    });
  }, [championsReport, tournamentSearch, tournamentCountry]);

  const allPokemon = data?.pokemon ?? [];
  const topPokemon = allPokemon.slice(0, pokeVisible);
  const chartPokemon: UsageBarItem[] = topPokemon.map((p) => ({
    name: p.species,
    usage_percent: p.usage_percent,
    count: p.count,
    sprite_url: p.sprite_url,
    sprite_fallback_url: p.sprite_fallback_url,
    home_sprite_url: p.home_sprite_url,
    tier: p.tier,
    meta_score: p.meta_score,
    win_rate: p.win_rate,
    id: p.species,
  }));
  // The tier view needs the whole meta: tiering the visible ten would put
  // three of them in S and say nothing.
  const tierPokemon: UsageBarItem[] = allPokemon.map((p) => ({
    name: p.species,
    usage_percent: p.usage_percent,
    count: p.count,
    sprite_url: p.sprite_url,
    sprite_fallback_url: p.sprite_fallback_url,
    home_sprite_url: p.home_sprite_url,
    tier: p.tier,
    meta_score: p.meta_score,
    win_rate: p.win_rate,
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
  // A brand-new regulation legitimately has very little data. Saying so beats
  // rendering a near-empty Panel and letting the user conclude it is broken.
  const isThinData =
    data !== undefined && data.total_entries > 0 && data.total_entries < THIN_DATA_TEAMS;
  const topItems = data?.top_items ?? [];
  const topMoves = data?.top_moves ?? [];
  const topAbilities = data?.top_abilities ?? [];
  const itemUsers = useMemo(
    () => buildEntityUsers(allPokemon, "top_items"),
    [allPokemon],
  );
  const moveUsers = useMemo(
    () => buildEntityUsers(allPokemon, "top_moves"),
    [allPokemon],
  );
  const abilityUsers = useMemo(
    () => buildEntityUsers(allPokemon, "top_abilities"),
    [allPokemon],
  );

  const isMobile = useIsMobile();
  const { data: syncStatus } = useRegulationStatus();
  const sourceValidated = syncStatus?.warnings.find(
    (w): w is Extract<typeof w, { kind: "source_validated" }> =>
      w.kind === "source_validated",
  );
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: queryKeys.liveStreams });
    qc.invalidateQueries({ queryKey: queryKeys.regulationNews });
    qc.invalidateQueries({
      queryKey: queryKeys.meta(
        format,
        undefined,
        sourceFilter,
        dateRange?.from,
        dateRange?.to,
      ),
    });
    qc.invalidateQueries({
      queryKey: queryKeys.championsReport(
        format,
        tournamentLimit,
        dateRange?.from,
        dateRange?.to,
      ),
    });
  };
  const ptrState = usePullToRefresh(refreshAll, isMobile);

  const updateRange = (patch: Partial<{ from: string; to: string }>) => {
    if (!dateRange) return;
    const next = { ...dateRange, ...patch };
    if (next.from > next.to) {
      if (patch.from) next.to = next.from;
      else next.from = next.to;
    }
    setDateRange(next);
  };

  return (
    <div>
      {isMobile && <PullToRefreshIndicator state={ptrState} />}
      <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <FormatSelector
            value={format}
            favorite={favoriteFormat}
            options={formatOptions}
            onChange={setFormat}
            onFavoriteChange={setFavoriteFormat}
            className="w-full sm:w-72"
          />
          {view === "metrics" && (
            <>
              <SourceSelector
                value={sourceFilter}
                onChange={setSourceFilter}
                sources={data?.sources ?? []}
                favorite={favoriteSource}
                onFavoriteChange={setFavoriteSource}
                className="w-full sm:w-72"
              />
              {!isMobile && (
                <button
                  className="btn-ghost h-10"
                  disabled={isFetching}
                  onClick={() =>
                    qc.invalidateQueries({
                      queryKey: queryKeys.meta(
                        format,
                        undefined,
                        sourceFilter,
                        dateRange?.from,
                        dateRange?.to,
                      ),
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
            </>
          )}
        </div>
      </header>

      <DashboardViewTabs
        view={view}
        pinned={dashboardView === view}
        onChange={setView}
        onPin={() => setDashboardView(view)}
      />

      {view === "metrics" && selectedRegulation && defaultRange && dateRange && (
        <section className="card space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                <CalendarRange size={15} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {t("dashboard.date_range")}
                  </span>
                  {seasonName && (
                    <span
                      className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      style={{
                        borderColor: "var(--accent)",
                        color: "var(--accent)",
                      }}
                      title={t("feed.data_days_hint")}
                    >
                      {seasonName}
                    </span>
                  )}
                  {isCustomRange && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--warning) 16%, transparent)",
                        color: "var(--warning)",
                      }}
                    >
                      {t("dashboard.custom_range")}
                    </span>
                  )}
                </div>
                <p
                  className="truncate text-[10px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {formatDate(dateRange.from, i18n.language)} →{" "}
                  {formatDate(dateRange.to, i18n.language)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label
                className="flex h-9 items-center gap-1.5 rounded-lg border px-2 transition-colors focus-within:border-[var(--accent)]"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg)",
                }}
              >
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("dashboard.from")}
                </span>
                <input
                  type="date"
                  className="w-[7.4rem] bg-transparent text-xs outline-none"
                  style={{ color: "var(--text)" }}
                  value={dateRange.from}
                  min={regulationStart}
                  max={todayIso}
                  onChange={(event) => updateRange({ from: event.target.value })}
                  aria-label={t("dashboard.from")}
                />
              </label>
              <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                →
              </span>
              <label
                className="flex h-9 items-center gap-1.5 rounded-lg border px-2 transition-colors focus-within:border-[var(--accent)]"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg)",
                }}
              >
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-dim)" }}
                >
                  {t("dashboard.to")}
                </span>
                <input
                  type="date"
                  className="w-[7.4rem] bg-transparent text-xs outline-none"
                  style={{ color: "var(--text)" }}
                  value={dateRange.to}
                  min={dateRange.from}
                  max={todayIso}
                  onChange={(event) => updateRange({ to: event.target.value })}
                  aria-label={t("dashboard.to")}
                />
              </label>
              <button
                type="button"
                className="btn-ghost h-9 text-[11px]"
                disabled={!isCustomRange}
                onClick={() => setDateRange(defaultRange)}
              >
                <RotateCcw size={12} className="mr-1" />
                {seasonName
                  ? t("dashboard.reset_season", { season: seasonName })
                  : t("dashboard.reset_regulation")}
              </button>
            </div>
          </div>

          {isCustomRange && (
            <p
              className="mt-2 flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px]"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--warning) 35%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--warning) 8%, transparent)",
                color: "var(--warning)",
              }}
            >
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              {t("dashboard.range_warning", {
                season: seasonName ?? t("dashboard.range_regulation"),
              })}
            </p>
          )}
        </section>
      )}
      {(sourceValidated || syncStatus?.calendar_pending) && (
        <div
          className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs"
          style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {sourceValidated
              ? t("regulations.source_validated_banner", {
                  teams: sourceValidated.teams,
                  count: sourceValidated.source_count,
                })
              : t("regulations.calendar_pending")}
          </span>
        </div>
      )}
      {view === "metrics" ? (
        <>
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

      <PanelOrderGroup
        order={metricsOrder}
        onOrderChange={(order) => setMetricsOrder(order as MetricsPanelId[])}
      >
      {data && data.pokemon.length > 0 && (
        <>
          <PanelOrder
            id="top_pokemon"
            label={t("dashboard.top_pokemon")}
            icon={<BarChart3 size={12} />}
          >
          <section className="card">
            {(data?.sources?.length ?? 0) > 0 && (
              <div className="mb-2">
                <SourceProvenanceChips sources={data?.sources ?? []} />
              </div>
            )}
            {isThinData && (
              <div
                className="mb-2 rounded-md border px-3 py-2 text-[11px]"
                style={{
                  borderColor: "var(--warning)",
                  color: "var(--warning)",
                  backgroundColor: "var(--bg-elev-strong)",
                }}
              >
                {t("dashboard.thin_data", {
                  tournaments: data?.tournaments_used ?? 0,
                  teams: data?.total_entries ?? 0,
                })}
              </div>
            )}
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
                    { id: "tier", Icon: Trophy, label: t("dashboard.chart_view_tier") },
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
            {topPokemonView === "tier" && (
              <UsageTierList data={tierPokemon} onItemClick={handleBarClick} />
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
          </PanelOrder>

          <PanelOrder
            id="trending"
            label={t("dashboard.panel_trending")}
            icon={<TrendingUp size={12} />}
          >
            <TrendingCard format={format} />
          </PanelOrder>

          <PanelOrder
            id="top_entities"
            label={t("dashboard.panel_top_entities")}
            icon={<LayoutGrid size={12} />}
          >
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_items")}
              </h2>
              <TopList
                data={topItems}
                limit={10}
                entityKind="item"
                users={itemUsers}
              />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_moves")}
              </h2>
              <TopList
                data={topMoves}
                limit={10}
                entityKind="move"
                users={moveUsers}
              />
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("dashboard.top_abilities")}
              </h2>
              <TopList
                data={topAbilities}
                limit={10}
                entityKind="ability"
                users={abilityUsers}
              />
            </div>
          </section>
          </PanelOrder>

        </>
      )}

      <PanelOrder
        id="recent_tournaments"
        label={
          format === "regulation-i"
            ? t("dashboard.recent_tournaments")
            : t("dashboard.champions_report")
        }
        icon={<Trophy size={12} />}
      >
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
          <div className="mb-2 flex flex-col gap-2 sm:flex-row">
            <SearchTextInput
              value={tournamentSearch}
              onChange={setTournamentSearch}
              placeholder={t("common.filter_search_tournament")}
            />
            <CountryFilter
              options={championCountryOptions}
              selected={tournamentCountry}
              onChange={setTournamentCountry}
              placeholder={t("common.filter_country_placeholder")}
              className="sm:w-64"
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
          filteredTournaments.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("common.no_results")}
            </p>
          ) : (
          <ul className="divide-y divide-[var(--border)]">
            {filteredTournaments.map((tour) => (
              <li
                key={tour.id}
                className="flex flex-wrap items-center gap-3 py-2.5"
              >
                <div className="min-w-0 flex-[1_1_20rem]">
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
                    {tour.champion_country && (
                      <span>
                        {" "}· {countryFlag(tour.champion_country)}{" "}
                        {tour.champion_country.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <ChampionTeam tournament={tour} />
                  <button
                    className="btn-ghost shrink-0 text-xs"
                    onClick={() => setSelectedTournament(tour)}
                  >
                    {t("dashboard.view_standings")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          )
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
            {filteredTournaments.length >= tournamentVisible && (
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
      </PanelOrder>

      <PanelOrder
        id="upcoming"
        label={t("upcoming.title")}
        icon={<CalendarClock size={12} />}
      >
        <UpcomingTournamentsSection />
      </PanelOrder>

      <PanelOrder
        id="external_sources"
        label={t("dashboard.external_sources")}
        icon={<ExternalLink size={12} />}
      >
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
      </PanelOrder>
      </PanelOrderGroup>
        </>
      ) : view === "regulation" ? (
        <RegulationInfoView
          format={format}
          info={selectedRegulation}
          panelOrder={regulationOrder}
          onPanelOrderChange={(order) =>
            setRegulationOrder(order as RegulationPanelId[])
          }
        />
      ) : (
        <RegulationFeed format={format} info={selectedRegulation} />
      )}

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
