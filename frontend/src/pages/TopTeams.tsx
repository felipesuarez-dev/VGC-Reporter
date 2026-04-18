import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { ChampionsTournament, Format, TopTeam } from "../lib/types";
import { MiniTeam } from "../components/pokemon/MiniTeam";
import { TopTeamDetailModal } from "../components/team/TopTeamDetailModal";
import { TournamentStandingsDrawer } from "../components/tournament/TournamentStandingsDrawer";
import { PokemonMultiSelect } from "../components/filters/PokemonMultiSelect";
import { formatDate } from "../lib/formatDate";
import { formatLabel } from "../lib/labels";

const FORMAT: Format = "regulation-m-a";
const RECENT_INITIAL = 5;
const RECENT_EXPANDED = 20;
const CARDS_PAGE = 20;

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
  const [visibleCards, setVisibleCards] = useState(CARDS_PAGE);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState<string[]>([]);

  const { data: report, isLoading, isError, isFetching } = useQuery({
    queryKey: queryKeys.topTeams(FORMAT),
    queryFn: () => ipc.getTopTeams(FORMAT, 100),
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
  const filteredTeams = speciesFilter.length === 0
    ? teams
    : teams.filter((tt) => {
        const memberIds = new Set(tt.members.map((m) => canonical(m.species)));
        return speciesFilter.every((id) => memberIds.has(id));
      });
  const visibleTeams = filteredTeams.slice(0, visibleCards);

  const recentLimit = recentExpanded ? RECENT_EXPANDED : RECENT_INITIAL;
  const recentTournaments =
    championsReport?.tournaments.slice(0, recentLimit) ?? [];
  const hasMoreRecent =
    (championsReport?.tournaments.length ?? 0) > RECENT_INITIAL;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: queryKeys.topTeams(FORMAT) });
    qc.invalidateQueries({
      queryKey: queryKeys.championsReport(FORMAT, RECENT_EXPANDED),
    });
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
        <button
          type="button"
          onClick={refresh}
          className="btn-ghost flex items-center gap-1 text-xs"
          disabled={isFetching}
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          {t("dashboard.refresh")}
        </button>
      </header>

      {meta && (
        <div
          className="card flex flex-wrap gap-x-4 gap-y-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--text)" }}>
            {formatLabel(t, FORMAT)}
          </span>
          <span>
            {t("top_teams.tournaments_analyzed")}:{" "}
            <span style={{ color: "var(--text)" }}>
              {meta.tournaments_analyzed}
            </span>
          </span>
          <span>
            {t("top_teams.battles")}:{" "}
            <span style={{ color: "var(--text)" }}>{meta.battles_analyzed}</span>
          </span>
          {meta.from_date && meta.to_date && (
            <span>
              {formatDate(meta.from_date, i18n.language)} —{" "}
              {formatDate(meta.to_date, i18n.language)}
            </span>
          )}
          <span>
            {t("common.source")}:{" "}
            <span style={{ color: "var(--text)" }}>{meta.source}</span>
          </span>
        </div>
      )}

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
      {!isLoading && teams.length === 0 && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("common.empty")}
        </div>
      )}

      {teams.length > 0 && (
        <div className="card space-y-1">
          <label className="label">{t("top_teams.filter_by_pokemon")}</label>
          <PokemonMultiSelect
            pokedex={pokedex}
            selected={speciesFilter}
            onChange={setSpeciesFilter}
          />
        </div>
      )}

      {speciesFilter.length > 0 && filteredTeams.length === 0 && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("top_teams.filter_no_matches")}
        </div>
      )}

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

      {filteredTeams.length > visibleCards && (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setVisibleCards((n) => n + CARDS_PAGE)}
          >
            {t("common.see_more")}
          </button>
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
                    {tour.date && <span>{formatDate(tour.date, i18n.language)}</span>}
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
    </div>
  );
}
