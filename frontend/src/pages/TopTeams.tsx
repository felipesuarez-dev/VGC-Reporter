import { useMemo, useState, useTransition } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { Format, OfficialTournamentTeams, TopTeam } from "../lib/types";
import { MiniTeam } from "../components/pokemon/MiniTeam";
import { TopTeamDetailModal } from "../components/team/TopTeamDetailModal";
import { LoadAllTeamsConfirmModal } from "../components/team/LoadAllTeamsConfirmModal";
import { ExportLargeMdConfirmModal } from "../components/team/ExportLargeMdConfirmModal";
import { RecentTournamentsSection } from "../components/dashboard/RecentTournamentsSection";
import { PokemonMultiSelect } from "../components/filters/PokemonMultiSelect";
import { SearchTextInput } from "../components/filters/SearchTextInput";
import { CountryFilter } from "../components/filters/CountryFilter";
import { SourcesChip } from "../components/layout/SourcesChip";
import { SearchSelect } from "../components/ui/SearchSelect";
import { openExternal } from "../lib/openExternal";
import { defaultRangeFor } from "../lib/regulations";
import { formatLabel } from "../lib/labels";
import { useUiStore } from "../stores/uiStore";
import { useDashboardStore } from "../stores/dashboardStore";
import { useRegulationCatalog } from "../hooks/useRegulationCatalog";
import { useLongLoadingHint } from "../hooks/useLoadingHint";
import { useHomeCountryFilter } from "../hooks/useHomeCountryFilter";
import { useIsMobile } from "../hooks/useIsMobile";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/layout/PullToRefreshIndicator";

const TOP_TEAMS_DEFAULT_FETCH = 100;
const ALL_SENTINEL = "all" as const;
type DisplayLimit = number | typeof ALL_SENTINEL;
const DISPLAY_OPTIONS: readonly DisplayLimit[] = [
  5,
  10,
  20,
  50,
  100,
  500,
  1000,
  2000,
  ALL_SENTINEL,
];

function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const up = code.toUpperCase();
  const a = 0x1f1e6 - "A".charCodeAt(0);
  return String.fromCodePoint(up.charCodeAt(0) + a, up.charCodeAt(1) + a);
}

function canonical(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function officialTopTeams(data: OfficialTournamentTeams): TopTeam[] {
  return data.teams.flatMap((team) => {
    const members = team.pokemon.map((pokemon) => ({
      species: pokemon.name,
      sprite_url: pokemon.sprite_url,
      sprite_fallback_url: pokemon.sprite_fallback_url,
      home_sprite_url: pokemon.home_sprite_url,
      item: pokemon.item,
      tera_type: pokemon.tera_type,
      ability: pokemon.ability,
      nature: null,
      moves: pokemon.moves,
      level: null,
      evs: null,
      ivs: null,
    }));
    if (members.length < 3) return [];
    return [
      {
        tournament: data.tournament_name,
        placing: team.placing,
        player: team.player_name,
        country: team.country,
        record: team.record,
        members,
        provider: "official",
        community: false,
        official: true,
        source_url: data.source_url,
        shared_at: data.tournament_date,
      },
    ];
  });
}

export function TopTeams() {
  const { t } = useTranslation();
  // Top Teams used to be pinned to a hardcoded regulation, so it silently
  // disagreed with the Dashboard selector. It now follows the same store.
  const FORMAT: Format = useDashboardStore((s) => s.format);
  // Keep the active regulation in sync even when this is the first page the
  // user opens after a launch.
  const { regulations } = useRegulationCatalog();
  const selectedRegulation =
    regulations.find((regulation) => regulation.id === FORMAT) ?? null;
  const defaultRange = selectedRegulation
    ? defaultRangeFor(selectedRegulation)
    : null;
  const storedRange = useDashboardStore((s) => s.dateRanges[FORMAT]);
  const dateRange = storedRange ?? defaultRange;
  const sourceFilter = useDashboardStore((s) => s.sourceFilter);
  const [teamProvider, setTeamProvider] = useState<
    "all" | "official" | "labmaus" | "limitless" | "pokebase"
  >("all");
  const [pokebaseOrigin, setPokebaseOrigin] = useState<
    "all" | "community" | "tournament"
  >("all");
  const apiSource =
    teamProvider === "official"
      ? null
      : teamProvider !== "all"
        ? teamProvider
        : sourceFilter === "labmaus" || sourceFilter === "limitless"
          ? sourceFilter
          : null;
  const qc = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<TopTeam | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [displayLimit, setDisplayLimit] = useState<DisplayLimit>(20);
  const [fetchLimit, setFetchLimit] = useState<number>(TOP_TEAMS_DEFAULT_FETCH);
  const [isPendingDisplay, startDisplayTransition] = useTransition();
  const [isOpeningTeam, startOpenTeamTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAllCount, setPendingAllCount] = useState(0);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [pendingExportCount, setPendingExportCount] = useState(0);
  const confirmAllTopTeams = useUiStore((s) => s.confirmAllTopTeams);
  const setConfirmAllTopTeams = useUiStore((s) => s.setConfirmAllTopTeams);
  const confirmLargeMdExport = useUiStore((s) => s.confirmLargeMdExport);
  const setConfirmLargeMdExport = useUiStore((s) => s.setConfirmLargeMdExport);

  const { data: report, isLoading, isError, isFetching } = useQuery({
    queryKey: queryKeys.topTeams(
      FORMAT,
      fetchLimit,
      apiSource,
      dateRange?.from,
      dateRange?.to,
    ),
    queryFn: () =>
      ipc.getTopTeams(
        FORMAT,
        fetchLimit,
        apiSource,
        dateRange?.from,
        dateRange?.to,
      ),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const { data: pokedex = [] } = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const officialReport = useQuery({
    queryKey: queryKeys.championsReport(FORMAT, 20, null, null),
    queryFn: () => ipc.listChampionsTournaments(FORMAT, 20),
    staleTime: 30 * 60 * 1000,
    enabled: teamProvider === "all" || teamProvider === "official",
  });
  const officialEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (officialReport.data?.official_tournaments ?? [])
      .filter(
        (event) =>
          event.source === "play-pokemon" &&
          event.date &&
          (event.end_date ?? event.date) <= today &&
          (!dateRange?.from || event.date >= dateRange.from) &&
          (!dateRange?.to || event.date <= dateRange.to),
      )
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 4);
  }, [officialReport.data, dateRange?.from, dateRange?.to]);
  const officialQueries = useQueries({
    queries: officialEvents.map((event) => ({
      queryKey: queryKeys.officialTeams(event.name, event.date),
      queryFn: () => ipc.getOfficialTournamentTeams(event.name, event.date),
      staleTime: 30 * 60 * 1000,
      enabled: teamProvider === "all" || teamProvider === "official",
    })),
  });
  const officialTeams = useMemo(
    () =>
      officialQueries.flatMap((query) =>
        query.data ? officialTopTeams(query.data) : [],
      ),
    [officialQueries],
  );
  const officialLoading =
    officialReport.isLoading || officialQueries.some((query) => query.isLoading);
  const officialFetching =
    officialReport.isFetching || officialQueries.some((query) => query.isFetching);
  const pageLoading = teamProvider === "official" ? officialLoading : isLoading;
  const pageFetching = teamProvider === "official" ? officialFetching : isFetching;
  const pageError =
    teamProvider === "official"
      ? officialReport.isError ||
        (officialQueries.length > 0 &&
          officialQueries.every((query) => query.isError))
      : isError;
  const showInitialHint = useLongLoadingHint(pageLoading || pageFetching);
  const showInitialPatience = useLongLoadingHint(
    pageLoading || pageFetching,
    60_000,
  );
  const showDisplayHint = useLongLoadingHint(isPendingDisplay);
  const showDisplayPatience = useLongLoadingHint(isPendingDisplay, 60_000);
  const showOpenTeamHint = useLongLoadingHint(isOpeningTeam);
  const showOpenTeamPatience = useLongLoadingHint(isOpeningTeam, 60_000);
  // Datos ya disponibles, solo queda el render del nuevo batch.
  const isRenderingTail = !isFetching && isPendingDisplay;

  const baseTeams = report?.teams ?? [];
  const teams =
    teamProvider === "official"
      ? officialTeams
      : teamProvider === "all"
        ? [...officialTeams.slice(0, 8), ...baseTeams]
        : baseTeams;
  const meta =
    teamProvider === "official"
      ? {
          tournaments_analyzed: officialEvents.length,
          battles_analyzed: officialTeams.length,
          source: "official",
          from_date: officialEvents.at(-1)?.date ?? null,
          to_date: officialEvents[0]?.date ?? null,
        }
      : report?.meta;
  const countryCodes = teams
    .map((team) => team.country?.toUpperCase())
    .filter((code): code is string => Boolean(code));
  // The home-country default is based on the community list (or the official
  // list when that provider is active), never on the handful of official
  // Top 8 teams merged into "all". One Chilean top-cut team must not hide the
  // entire community list.
  const baseCountryCodes = baseTeams
    .map((team) => team.country?.toUpperCase())
    .filter((code): code is string => Boolean(code));
  const {
    selected: countryFilter,
    setSelected: setCountryFilter,
    homeCountry,
  } = useHomeCountryFilter(
    teamProvider === "official" ? countryCodes : baseCountryCodes,
    3,
  );
  const countryOptions = Array.from(
    new Set([
      ...countryCodes,
      homeCountry,
    ]),
  );
  const filteredTeams = teams.filter((tt) => {
    if (speciesFilter.length > 0) {
      const memberIds = new Set(tt.members.map((m) => canonical(m.species)));
      if (!speciesFilter.every((id) => memberIds.has(id))) return false;
    }
    if (countryFilter.length > 0) {
      if (!tt.country || !countryFilter.includes(tt.country.toUpperCase())) return false;
    }
    if (teamProvider === "pokebase" && pokebaseOrigin !== "all") {
      if (pokebaseOrigin === "community" && !tt.community) return false;
      if (pokebaseOrigin === "tournament" && tt.community) return false;
    }
    const q = teamSearch.trim().toLowerCase();
    if (q) {
      const hay = `${tt.player ?? ""} ${tt.tournament ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const effectiveLimit =
    displayLimit === ALL_SENTINEL ? filteredTeams.length : displayLimit;
  const visibleTeams = filteredTeams.slice(0, effectiveLimit);

  const refresh = () => {
    qc.invalidateQueries({
      queryKey: queryKeys.topTeams(
        FORMAT,
        fetchLimit,
        apiSource,
        dateRange?.from,
        dateRange?.to,
      ),
    });
    qc.invalidateQueries({
      queryKey: queryKeys.championsReport(FORMAT, 20, null, null),
    });
    for (const event of officialEvents) {
      qc.invalidateQueries({
        queryKey: queryKeys.officialTeams(event.name, event.date),
      });
    }
  };
  const isMobile = useIsMobile();
  const ptrState = usePullToRefresh(refresh, isMobile);

  const applyAll = (total: number) => {
    startDisplayTransition(() => {
      setDisplayLimit(ALL_SENTINEL);
      setFetchLimit((current) => (total > current ? total : current));
    });
  };

  const allTeamsCount = meta?.battles_analyzed ?? filteredTeams.length;

  const computeExportN = () =>
    displayLimit === ALL_SENTINEL ? Math.max(1, teams.length) : displayLimit;

  const runExport = async (exportN: number) => {
    setIsExporting(true);
    try {
      const filenameSuffix =
        displayLimit === ALL_SENTINEL ? "all" : String(displayLimit);
      const path = await save({
        defaultPath: `top-${filenameSuffix}-teams-${FORMAT}.md`,
        filters: [{ name: "Markdown", extensions: ["md"] }],
        title: t("top_teams.export_save_title"),
      });
      if (!path) return;
      await ipc.saveTopTeamsMarkdown(FORMAT, exportN, path);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    const exportN = computeExportN();
    const displayN =
      displayLimit === ALL_SENTINEL ? allTeamsCount : displayLimit;
    const triggerCount = Math.max(displayN, exportN);
    if (triggerCount >= 500 && confirmLargeMdExport) {
      setPendingExportCount(triggerCount);
      setExportConfirmOpen(true);
      return;
    }
    await runExport(exportN);
  };

  return (
    <div>
      {isMobile && <PullToRefreshIndicator state={ptrState} />}
      <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("top_teams.title")}</h1>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("top_teams.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchSelect<string>
            value={teamProvider}
            options={["all", "official", "labmaus", "limitless", "pokebase"]}
            onChange={(value) => setTeamProvider((value ?? "all") as typeof teamProvider)}
            getOptionLabel={(value) => t(`top_teams.provider_${value}`)}
            allowClear={false}
            className="w-full sm:w-56"
            triggerClassName="h-8 text-xs"
          />
          {teamProvider === "pokebase" && (
            <div
              className="flex overflow-hidden rounded-md border"
              style={{ borderColor: "var(--border)" }}
            >
              {(["all", "community", "tournament"] as const).map((origin) => (
                <button
                  key={origin}
                  type="button"
                  className="px-2 py-1 text-[10px] font-medium"
                  style={{
                    backgroundColor:
                      pokebaseOrigin === origin
                        ? "var(--accent-soft)"
                        : "transparent",
                    color:
                      pokebaseOrigin === origin
                        ? "var(--accent)"
                        : "var(--text-muted)",
                  }}
                  onClick={() => setPokebaseOrigin(origin)}
                >
                  {t(`top_teams.origin_${origin}`)}
                </button>
              ))}
            </div>
          )}
          <div
            className="flex items-center gap-2 rounded-lg px-2 py-1"
            style={{
              backgroundColor: "color-mix(in srgb, var(--bg-elev) 85%, transparent)",
              border: "1px solid var(--border)",
            }}
          >
            <label
              htmlFor="top-teams-display-limit"
              className="text-xs"
              style={{ color: "var(--text-dim)" }}
            >
              {t("top_teams.export_count_label")}
            </label>
            <select
              id="top-teams-display-limit"
              value={displayLimit}
              onChange={(e) => {
                const v = e.target.value;
                if (v === ALL_SENTINEL) {
                  if (confirmAllTopTeams) {
                    setPendingAllCount(allTeamsCount);
                    setConfirmOpen(true);
                    return;
                  }
                  applyAll(allTeamsCount);
                  return;
                }
                const next = Number(v);
                startDisplayTransition(() => {
                  setDisplayLimit(next);
                  setFetchLimit((current) => (next > current ? next : current));
                });
              }}
              className="input h-7 px-1 py-0 text-xs"
              disabled={isExporting}
            >
              {DISPLAY_OPTIONS.map((opt) => (
                <option key={String(opt)} value={opt}>
                  {opt === ALL_SENTINEL
                    ? meta
                      ? t("top_teams.export_count_all_n", { count: allTeamsCount })
                      : t("top_teams.export_count_all")
                    : opt}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExport}
              className="btn-ghost flex items-center gap-1 whitespace-nowrap px-2 text-xs"
              disabled={isExporting || isLoading}
            >
              <Download size={14} />
              {isExporting ? t("top_teams.exporting") : t("top_teams.export_md")}
            </button>
          </div>
          {!isMobile && (
            <button
              type="button"
              onClick={refresh}
              className="btn-ghost flex items-center gap-1 text-xs"
              disabled={isFetching}
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              {t("dashboard.refresh")}
            </button>
          )}
        </div>
      </header>

      {meta && (
        <div className="flex items-center gap-2">
          <SourcesChip
            tournamentsUsed={meta.tournaments_analyzed}
            battlesAnalyzed={meta.battles_analyzed}
            fromDate={meta.from_date}
            toDate={meta.to_date}
            prefix={formatLabel(t, FORMAT)}
            includeOfficial
          />
        </div>
      )}

      {pageLoading && (
        <div
          className="card flex flex-col gap-1"
          style={{ color: "var(--text-muted)" }}
          aria-busy="true"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>{t("common.loading")}</span>
          </div>
          {showInitialHint && (
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("top_teams.loading_long_hint")}
            </span>
          )}
          {showInitialPatience && (
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("top_teams.loading_patience_hint")}
            </span>
          )}
        </div>
      )}
      {!pageLoading && pageFetching && teams.length > 0 && (
        <div
          className="card flex flex-col gap-1"
          style={{ color: "var(--text-muted)" }}
          aria-busy="true"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>{t("common.loading")}</span>
          </div>
          {showInitialHint && (
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("top_teams.loading_long_hint")}
            </span>
          )}
          {showInitialPatience && (
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("top_teams.loading_patience_hint")}
            </span>
          )}
        </div>
      )}
      {pageError && (
        <div className="card" style={{ color: "var(--danger)" }}>
          {t("common.error")}
        </div>
      )}
      {!pageLoading && teams.length === 0 && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("common.empty")}
        </div>
      )}

      {teams.length > 0 && (
        <div className="card space-y-3">
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="label">{t("common.search")}</label>
              <SearchTextInput
                value={teamSearch}
                onChange={setTeamSearch}
                placeholder={t("common.filter_search_player")}
              />
            </div>
            <div className="space-y-1">
              <label className="label">{t("common.filter_country")}</label>
              <CountryFilter
                options={countryOptions}
                selected={countryFilter}
                onChange={setCountryFilter}
                placeholder={t("common.filter_country_placeholder")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="label">{t("top_teams.filter_by_pokemon")}</label>
            <PokemonMultiSelect
              pokedex={pokedex}
              selected={speciesFilter}
              onChange={setSpeciesFilter}
            />
          </div>
        </div>
      )}

      {speciesFilter.length > 0 && filteredTeams.length === 0 && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("top_teams.filter_no_matches")}
        </div>
      )}

      {isPendingDisplay && teams.length > 0 && (
        <div
          className="card flex min-h-[240px] flex-col items-center justify-center gap-3"
          style={{ color: "var(--text-muted)" }}
          aria-busy="true"
          aria-live="polite"
        >
          <Loader2
            size={48}
            className="animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <span className="text-base">{t("common.loading")}</span>
          {showDisplayHint && (
            <span className="max-w-md text-center text-xs" style={{ color: "var(--text-dim)" }}>
              {t("top_teams.loading_long_hint")}
            </span>
          )}
          {showDisplayPatience && (
            <span className="max-w-md text-center text-xs" style={{ color: "var(--text-dim)" }}>
              {t("top_teams.loading_patience_hint")}
            </span>
          )}
          {isRenderingTail && (
            <span className="max-w-md text-center text-xs" style={{ color: "var(--text-dim)" }}>
              {t("top_teams.loading_almost_done_hint")}
            </span>
          )}
        </div>
      )}

      {!isPendingDisplay && (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleTeams.map((tt, idx) => (
          <div
            key={`${tt.tournament}-${idx}`}
            role="button"
            tabIndex={0}
            onClick={() => startOpenTeamTransition(() => setSelectedTeam(tt))}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                startOpenTeamTransition(() => setSelectedTeam(tt));
              }
            }}
            className="card cursor-pointer space-y-3 text-left transition hover:border-[var(--accent)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div
                  className="flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {tt.country && (
                    <span
                      className="shrink-0"
                      aria-label={tt.country ?? ""}
                      title={tt.country ?? ""}
                    >
                      {flagEmoji(tt.country)}
                    </span>
                  )}
                  <span className="truncate">{tt.player ?? "—"}</span>
                </div>
                <div
                  className="truncate text-[11px]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {tt.tournament}
                </div>
                {tt.official ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--warning) 16%, transparent)",
                        color: "var(--warning)",
                      }}
                    >
                      <BadgeCheck size={9} />
                      {t("top_teams.official_badge")}
                    </span>
                  </div>
                ) : (
                  tt.provider && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: "var(--accent-soft)",
                          color: "var(--accent)",
                        }}
                      >
                        {t(`top_teams.provider_${tt.provider}`)}
                      </span>
                      {tt.community && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[8px] uppercase tracking-wide"
                          style={{
                            backgroundColor: "var(--bg-elev-strong)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {t("top_teams.origin_community")}
                        </span>
                      )}
                    </div>
                  )
                )}
                {tt.source_url && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-medium underline-offset-2 hover:underline"
                    style={{
                      backgroundColor: "var(--bg-elev-strong)",
                      color: "var(--accent)",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      void openExternal(tt.source_url!);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    title={tt.source_url}
                  >
                    <ExternalLink size={9} />
                    {t("top_teams.original_source")}
                  </button>
                )}
              </div>
              <div
                className="shrink-0 whitespace-nowrap text-right text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                {tt.placing != null && <span>#{tt.placing}</span>}
                {tt.placing != null && tt.record && <span> · </span>}
                {tt.record && <span>{tt.record}</span>}
              </div>
            </div>
            <MiniTeam
              members={tt.members.map((m) => ({
                species: m.species,
                sprite_url: m.sprite_url,
                sprite_fallback_url: m.sprite_fallback_url,
                home_sprite_url: m.home_sprite_url,
                item: m.item,
                ability: m.ability,
                tera_type: m.tera_type,
                nature: m.nature,
                moves: m.moves,
              }))}
              cols={6}
              size={40}
            />
          </div>
        ))}
      </div>
      )}

      <RecentTournamentsSection format={FORMAT} />

      <TopTeamDetailModal
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
      <LoadAllTeamsConfirmModal
        open={confirmOpen}
        count={pendingAllCount}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={(dontAsk) => {
          if (dontAsk) setConfirmAllTopTeams(false);
          setConfirmOpen(false);
          applyAll(pendingAllCount);
        }}
      />
      <ExportLargeMdConfirmModal
        open={exportConfirmOpen}
        count={pendingExportCount}
        onCancel={() => setExportConfirmOpen(false)}
        onConfirm={(dontAsk) => {
          if (dontAsk) setConfirmLargeMdExport(false);
          setExportConfirmOpen(false);
          void runExport(computeExportN());
        }}
      />
      {isOpeningTeam && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          aria-busy="true"
          aria-live="polite"
        >
          <div
            className="flex max-w-md flex-col gap-2 rounded-lg px-4 py-3 shadow-2xl"
            style={{
              backgroundColor: "var(--bg-elev)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
              <span className="text-sm">{t("common.loading")}</span>
            </div>
            {showOpenTeamHint && (
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                {t("top_teams.loading_long_hint")}
              </span>
            )}
            {showOpenTeamPatience && (
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                {t("top_teams.loading_patience_hint")}
              </span>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
