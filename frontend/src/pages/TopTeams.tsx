import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { ChampionsTournament, Format, TopTeam } from "../lib/types";
import { MiniTeam } from "../components/pokemon/MiniTeam";
import { TopTeamDetailModal } from "../components/team/TopTeamDetailModal";
import { LoadAllTeamsConfirmModal } from "../components/team/LoadAllTeamsConfirmModal";
import { TournamentStandingsDrawer } from "../components/tournament/TournamentStandingsDrawer";
import { PokemonMultiSelect } from "../components/filters/PokemonMultiSelect";
import { SearchTextInput } from "../components/filters/SearchTextInput";
import { CountryFilter } from "../components/filters/CountryFilter";
import { SourcesChip } from "../components/layout/SourcesChip";
import { formatDateTime } from "../lib/formatDate";
import { formatLabel } from "../lib/labels";
import { useUiStore } from "../stores/uiStore";

const FORMAT: Format = "regulation-m-a";
const RECENT_INITIAL = 5;
const RECENT_EXPANDED = 20;
const TOP_TEAMS_FETCH_LIMIT = 1000;
const ALL_SENTINEL = "all" as const;
type DisplayLimit = number | typeof ALL_SENTINEL;
const DISPLAY_OPTIONS: readonly DisplayLimit[] = [5, 10, 20, 50, 100, ALL_SENTINEL];

function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const up = code.toUpperCase();
  const a = 0x1f1e6 - "A".charCodeAt(0);
  return String.fromCodePoint(up.charCodeAt(0) + a, up.charCodeAt(1) + a);
}

function canonical(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function TopTeams() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [selectedTournament, setSelectedTournament] =
    useState<ChampionsTournament | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TopTeam | null>(null);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [recentSearch, setRecentSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState<DisplayLimit>(20);
  const [fetchLimit, setFetchLimit] = useState<number>(TOP_TEAMS_FETCH_LIMIT);
  const [isPendingDisplay, startDisplayTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAllCount, setPendingAllCount] = useState(0);
  const confirmAllTopTeams = useUiStore((s) => s.confirmAllTopTeams);
  const setConfirmAllTopTeams = useUiStore((s) => s.setConfirmAllTopTeams);

  const { data: report, isLoading, isError, isFetching } = useQuery({
    queryKey: queryKeys.topTeams(FORMAT, fetchLimit),
    queryFn: () => ipc.getTopTeams(FORMAT, fetchLimit),
  });
  const { data: pokedex = [] } = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: championsReport, isFetching: tournamentsFetching } = useQuery({
    queryKey: queryKeys.championsReport(FORMAT, RECENT_EXPANDED),
    queryFn: () => ipc.listChampionsTournaments(FORMAT, RECENT_EXPANDED),
    staleTime: 30 * 60 * 1000,
  });

  const teams = report?.teams ?? [];
  const meta = report?.meta;
  const countryOptions = Array.from(
    new Set(teams.map((tt) => tt.country).filter((c): c is string => !!c && c.length === 2)),
  );
  const filteredTeams = teams.filter((tt) => {
    if (speciesFilter.length > 0) {
      const memberIds = new Set(tt.members.map((m) => canonical(m.species)));
      if (!speciesFilter.every((id) => memberIds.has(id))) return false;
    }
    if (countryFilter.length > 0) {
      if (!tt.country || !countryFilter.includes(tt.country.toUpperCase())) return false;
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

  const recentLimit = recentExpanded ? RECENT_EXPANDED : RECENT_INITIAL;
  const recentQuery = recentSearch.trim().toLowerCase();
  const filteredRecent =
    championsReport?.tournaments.filter((tour) =>
      recentQuery ? (tour.name ?? "").toLowerCase().includes(recentQuery) : true,
    ) ?? [];
  const recentTournaments = filteredRecent.slice(0, recentLimit);
  const hasMoreRecent = filteredRecent.length > RECENT_INITIAL;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: queryKeys.topTeams(FORMAT, fetchLimit) });
    qc.invalidateQueries({
      queryKey: queryKeys.championsReport(FORMAT, RECENT_EXPANDED),
    });
  };

  const applyAll = (total: number) => {
    startDisplayTransition(() => {
      setDisplayLimit(ALL_SENTINEL);
      setFetchLimit((current) => (total > current ? total : current));
    });
  };

  const allTeamsCount = meta?.battles_analyzed ?? filteredTeams.length;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportN =
        displayLimit === ALL_SENTINEL
          ? Math.max(1, teams.length)
          : displayLimit;
      const filenameSuffix =
        displayLimit === ALL_SENTINEL ? "all" : String(displayLimit);
      const path = await save({
        defaultPath: `top-${filenameSuffix}-teams-regulation-m-a.md`,
        filters: [{ name: "Markdown", extensions: ["md"] }],
        title: t("top_teams.export_save_title"),
      });
      if (!path) return;
      await ipc.saveTopTeamsMarkdown(FORMAT, exportN, path);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("top_teams.title")}</h1>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("top_teams.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                startDisplayTransition(() => setDisplayLimit(next));
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
          <button
            type="button"
            onClick={refresh}
            className="btn-ghost flex items-center gap-1 text-xs"
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            {t("dashboard.refresh")}
          </button>
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
          />
        </div>
      )}

      {isLoading && (
        <div
          className="card flex items-center gap-2"
          style={{ color: "var(--text-muted)" }}
        >
          <Loader2 size={16} className="animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      )}
      {isError && (
        <div className="card" style={{ color: "var(--danger)" }}>
          {t("common.error")}
        </div>
      )}
      {!isLoading && teams.length === 0 && (
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
        </div>
      )}

      {!isPendingDisplay && (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleTeams.map((tt, idx) => (
          <button
            key={`${tt.tournament}-${idx}`}
            type="button"
            onClick={() => setSelectedTeam(tt)}
            className="card space-y-3 text-left transition hover:border-[var(--accent)]"
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
          </button>
        ))}
      </div>
      )}

      <section className="card">
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("dashboard.recent_tournaments")}
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
          {t("dashboard.tournaments_for_format", {
            format: formatLabel(t, FORMAT),
          })}
        </p>
        {championsReport && championsReport.tournaments.length > 0 && (
          <div className="mb-2">
            <SearchTextInput
              value={recentSearch}
              onChange={setRecentSearch}
              placeholder={t("common.filter_search_tournament")}
            />
          </div>
        )}
        {(tournamentsFetching || !championsReport) && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("common.loading")}
          </p>
        )}
        {championsReport &&
          !tournamentsFetching &&
          championsReport.tournaments.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("common.empty")}
            </p>
          )}
        {recentTournaments.length > 0 && (
          <ul className="divide-y divide-[var(--border)]">
            {recentTournaments.map((tour) => (
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
        {hasMoreRecent && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setRecentExpanded((v) => !v)}
            >
              {recentExpanded ? t("common.see_less") : t("common.see_more")}
            </button>
          </div>
        )}
      </section>

      <TournamentStandingsDrawer
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
      />
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
    </div>
  );
}
