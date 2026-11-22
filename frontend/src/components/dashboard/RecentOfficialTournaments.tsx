import { ExternalLink, MapPin, Trophy, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChampionsTournament } from "../../lib/types";
import { countryFlag } from "../../lib/countries";
import { formatEventDateRange } from "../../lib/formatDate";
import { openExternal } from "../../lib/openExternal";
import { EventSourceBadge } from "./EventSourceBadge";
import {
  TournamentTierBadge,
  tournamentTierColor,
} from "./TournamentTierBadge";

interface Props {
  tournaments: ChampionsTournament[];
  className?: string;
}

/**
 * Official Championship Series majors (Internationals, Regionals, Specials
 * and Worlds) shown above the community list. They keep the official source
 * badge, a tier badge, the date range, prize pool when published and the
 * Masters winner when results are already available.
 */
export function RecentOfficialTournaments({ tournaments, className }: Props) {
  const { t, i18n } = useTranslation();
  if (tournaments.length === 0) return null;
  return (
    <div className={className}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Trophy size={12} style={{ color: "#f5c542" }} />
        <h3
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text)" }}
        >
          {t("dashboard.official_tournaments")}
        </h3>
        <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          {tournaments.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {tournaments.map((tournament) => {
          const accent = tournamentTierColor(tournament.tier);
          return (
            <li
              key={tournament.id}
              className="rounded-lg border px-2.5 py-2"
              style={{
                borderColor: "var(--border)",
                borderLeft: accent
                  ? `3px solid ${accent}`
                  : "3px solid var(--accent)",
                backgroundColor: accent
                  ? `color-mix(in srgb, ${accent} 8%, transparent)`
                  : "transparent",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {tournament.name}
                    </span>
                    <EventSourceBadge source="play-pokemon" />
                    <TournamentTierBadge tier={tournament.tier} />
                  </div>
                  <div
                    className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {tournament.date && (
                      <span>
                        {formatEventDateRange(
                          tournament.date,
                          tournament.end_date,
                          i18n.language,
                        )}
                      </span>
                    )}
                    {tournament.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={10} />
                        {tournament.location}
                      </span>
                    )}
                    {tournament.players != null && (
                      <span className="inline-flex items-center gap-1">
                        <Users size={10} />
                        {tournament.players} {t("dashboard.players")}
                      </span>
                    )}
                    {tournament.champion_name && (
                      <span>
                        {t("dashboard.champion_team")}:{" "}
                        {tournament.champion_country &&
                          `${countryFlag(tournament.champion_country)} `}
                        {tournament.champion_name}
                      </span>
                    )}
                  </div>
                  {tournament.prize_pool && (
                    <div
                      className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold"
                      style={{ color: "#f5c542" }}
                      title={t("upcoming.prize_pool")}
                    >
                      <Trophy size={10} />
                      {t("upcoming.prize_pool")}: {tournament.prize_pool}
                    </div>
                  )}
                </div>
                {tournament.url && (
                  <button
                    type="button"
                    className="btn-ghost shrink-0 text-xs"
                    onClick={() => openExternal(tournament.url!)}
                    title={t("dashboard.view_results")}
                  >
                    <ExternalLink size={12} className="mr-1" />
                    {t("dashboard.view_results")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
