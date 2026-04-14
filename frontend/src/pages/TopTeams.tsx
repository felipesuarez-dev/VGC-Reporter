import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import type { ChampionsTournament, Format } from "../lib/types";
import { MiniTeam } from "../components/pokemon/MiniTeam";
import { TournamentStandingsDrawer } from "../components/tournament/TournamentStandingsDrawer";

const FORMAT: Format = "regulation-m-a";
const RECENT_LIMIT = 10;

export function TopTeams() {
  const { t } = useTranslation();
  const [selectedTournament, setSelectedTournament] =
    useState<ChampionsTournament | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.topTeams(FORMAT),
    queryFn: () => ipc.getTopTeams(FORMAT, 20),
  });
  const { data: championsReport, isFetching: tournamentsFetching } = useQuery({
    queryKey: queryKeys.championsReport(FORMAT, RECENT_LIMIT),
    queryFn: () => ipc.listChampionsTournaments(FORMAT, RECENT_LIMIT),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("top_teams.title")}</h1>
      </header>

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
      {data && data.length === 0 && (
        <div className="card" style={{ color: "var(--text-muted)" }}>
          {t("common.empty")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((tt, idx) => (
          <div key={`${tt.tournament}-${idx}`} className="card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {tt.player ?? "—"}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                  {tt.tournament}
                </div>
              </div>
              <div className="text-right text-[11px]" style={{ color: "var(--text-muted)" }}>
                {tt.placing != null && (
                  <div>
                    {t("top_teams.placing")}: #{tt.placing}
                  </div>
                )}
                {tt.record && (
                  <div>
                    {t("top_teams.record")}: {tt.record}
                  </div>
                )}
              </div>
            </div>
            <MiniTeam
              members={tt.members.map((m) => ({
                species: m.species,
                sprite_url: m.sprite_url,
              }))}
              cols={6}
              size={40}
            />
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("dashboard.recent_tournaments")}
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
          {t("dashboard.tournaments_for_format", { format: FORMAT })}
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
      </section>

      <TournamentStandingsDrawer
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
      />
    </div>
  );
}
