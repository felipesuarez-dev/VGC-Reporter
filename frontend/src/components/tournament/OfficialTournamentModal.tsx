import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  MapPin,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { ChampionsTournament } from "../../lib/types";
import { countryFlag } from "../../lib/countries";
import { formatEventDateRange } from "../../lib/formatDate";
import { openExternal } from "../../lib/openExternal";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { findPlayerMatches } from "../../lib/tournamentPlayers";
import { useModalBack } from "../../hooks/useModalBack";
import { useLocalize } from "../../hooks/useTranslations";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { EventSourceBadge } from "../dashboard/EventSourceBadge";
import { TournamentTierBadge } from "../dashboard/TournamentTierBadge";
import { OfficialTeamsSection } from "./OfficialTeamsSection";
import { PlayerMatchHistory } from "./PlayerMatchHistory";
import { TopCutBracket } from "./TopCutBracket";

interface Props {
  tournament: ChampionsTournament | null;
  onClose: () => void;
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: "var(--bg-elev-strong)",
          color: "var(--text-dim)",
        }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          {label}
        </div>
        <div className="text-xs" style={{ color: "var(--text)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * In-app result sheet for a past/ongoing official Championship Series event.
 * Summary, prizing and the Masters winner come from the calendar/detail feed;
 * standings come from the official results endpoint. The official feed does
 * not publish decklists, so PokéBase enriches the top cut and PokéData adds the
 * bracket and per-round match history when available.
 */
export function OfficialTournamentModal({ tournament, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const localize = useLocalize();
  const [visible, setVisible] = useState(16);
  const [pageSize, setPageSize] = useState(32);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const tournamentName = tournament?.name ?? "";
  const tournamentDate = tournament?.date ?? null;

  useModalBack(Boolean(tournament), onClose);

  useEffect(() => {
    if (!tournament) return;
    setVisible(16);
    setPageSize(32);
    setExpandedPlayers(new Set());
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tournament, onClose]);

  const standings = useQuery({
    queryKey: queryKeys.officialStandings(
      tournament?.url ?? "",
      0,
      pageSize,
    ),
    queryFn: () =>
      ipc.getOfficialTournamentStandings(
        tournament!.url!,
        0,
        pageSize,
        tournamentName,
        tournamentDate,
      ),
    enabled: Boolean(tournament?.url && tournament.source === "play-pokemon"),
    staleTime: 30 * 60 * 1000,
  });

  const teams = useQuery({
    queryKey: queryKeys.officialTeams(tournamentName, tournamentDate),
    queryFn: () => ipc.getOfficialTournamentTeams(tournamentName, tournamentDate),
    enabled: Boolean(tournamentName && tournament?.source === "play-pokemon"),
    staleTime: 30 * 60 * 1000,
  });

  const detail = useQuery({
    queryKey: queryKeys.officialDetail(tournamentName, tournamentDate),
    queryFn: () => ipc.getOfficialTournamentDetail(tournamentName, tournamentDate),
    enabled: Boolean(tournamentName && tournament?.source === "play-pokemon"),
    staleTime: 30 * 60 * 1000,
  });

  const detailPlayers = useMemo(
    () => detail.data?.players ?? [],
    [detail.data],
  );

  if (!tournament) return null;

  const date = tournament.date
    ? formatEventDateRange(
        tournament.date,
        tournament.end_date,
        i18n.language,
      )
    : null;
  const rows = standings.data?.standings ?? [];
  const shown = rows.slice(0, visible);
  const detailData = detail.data ?? null;
  const teamsData =
    teams.data ??
    (detailData?.teams.length
      ? {
          source: "pokedata",
          source_url: detailData.source_url,
          tournament_name: detailData.tournament_name,
          tournament_date: detailData.tournament_date,
          teams: detailData.teams,
        }
      : null);
  const divisions = detailData?.divisions ?? [];
  const noMasters =
    divisions.length > 0 &&
    !divisions.some((division) => division.toLowerCase().includes("master"));
  const championFromData =
    teamsData?.teams.find((team) => team.placing === 1) ??
    detailData?.players.find((player) => player.place === 1) ??
    null;
  const championName = championFromData?.player_name ?? tournament.champion_name ?? null;
  const championCountry =
    championFromData?.country ?? tournament.champion_country ?? null;
  const hasTeams = Boolean(teamsData?.teams.length);

  const togglePlayer = (key: string) => {
    setExpandedPlayers((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tournament.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[93vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="relative flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3 pr-12"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <EventSourceBadge source="play-pokemon" />
              <TournamentTierBadge tier={tournament.tier} />
              {tournament.prize_pool && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: "color-mix(in srgb, #f5c542 16%, transparent)",
                    color: "#f5c542",
                  }}
                >
                  <Trophy size={10} />
                  {tournament.prize_pool}
                </span>
              )}
            </div>
            <h2 className="mt-1 line-clamp-2 text-base font-semibold" style={{ color: "var(--text)" }}>
              {tournament.name}
            </h2>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {date}
              {tournament.location ? ` · ${tournament.location}` : ""}
              {tournament.players != null
                ? ` · ${tournament.players} ${t("dashboard.players")}`
                : ""}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto sm:justify-end">
            {tournament.url && (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => openExternal(tournament.url!)}
              >
                <ExternalLink size={12} className="mr-1" />
                {t("feed.open_in_browser")}
              </button>
            )}
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]"
            style={{ color: "var(--text-muted)" }}
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            <div className="space-y-2">
              <Detail icon={<Trophy size={12} />} label={t("upcoming.champion")}>
                {championName ? (
                  <span>
                    {championCountry
                      ? `${countryFlag(championCountry)} `
                      : ""}
                    {championName}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-dim)" }}>
                    {t("official.no_champion")}
                  </span>
                )}
              </Detail>
              <Detail icon={<MapPin size={12} />} label={t("upcoming.city_country")}>
                {tournament.location || (
                  <span style={{ color: "var(--text-dim)" }}>
                    {t("upcoming.not_published")}
                  </span>
                )}
              </Detail>
              <Detail icon={<Users size={12} />} label={t("dashboard.players")}>
                {tournament.players ?? (
                  <span style={{ color: "var(--text-dim)" }}>
                    {t("upcoming.not_published")}
                  </span>
                )}
              </Detail>
              {divisions.length > 0 && (
                <Detail icon={<Users size={12} />} label={t("official.divisions")}>
                  {divisions.join(" · ")}
                </Detail>
              )}
            </div>
            <div className="space-y-2">
              <Detail icon={<Trophy size={12} />} label={t("upcoming.prize_pool")}>
                {tournament.prize_pool || (
                  <span style={{ color: "var(--text-dim)" }}>
                    {t("upcoming.not_published")}
                  </span>
                )}
              </Detail>
              <Detail icon={<Trophy size={12} />} label={t("official.decklist")}>
                {hasTeams || tournament.champion_team.length > 0
                  ? t("official.decklist_published")
                  : t("official.decklist_not_published")}
              </Detail>
            </div>
          </div>

          {tournament.champion_team.length > 0 && (
            <section className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text)" }}>
                {t("dashboard.champion_team")}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tournament.champion_team.slice(0, 6).map((pokemon, index) => (
                  <li
                    key={`${pokemon.name}-${index}`}
                    className="flex gap-2 rounded-lg border p-2"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--bg)",
                    }}
                  >
                    <PokemonSprite
                      url={pokemon.sprite_url}
                      fallbackUrl={pokemon.sprite_fallback_url ?? undefined}
                      homeUrl={pokemon.home_sprite_url ?? undefined}
                      name={pokemon.name}
                      size={42}
                      variant="pixel"
                    />
                    <div className="min-w-0 text-[10px]">
                      <div className="truncate text-[11px] font-semibold" style={{ color: "var(--text)" }}>
                        {pokemon.name}
                      </div>
                      {pokemon.item && (
                        <div style={{ color: "var(--text-muted)" }}>
                          {localize("item", pokemon.item)}
                        </div>
                      )}
                      {pokemon.moves.length > 0 && (
                        <div className="mt-0.5 line-clamp-2" style={{ color: "var(--text-dim)" }}>
                          {pokemon.moves.map((move) => localize("move", move)).join(" · ")}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {noMasters && (
            <div
              className="mt-4 rounded-lg border px-3 py-2 text-[11px]"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg)",
                color: "var(--text-muted)",
              }}
            >
              {t("official.junior_senior_note", {
                divisions: divisions.join(" · "),
              })}
            </div>
          )}

          {teamsData && <OfficialTeamsSection data={teamsData} />}

          {detailData &&
            detailData.top_cut.length === 0 &&
            detailData.teams.length > 0 &&
            !noMasters && (
              <p className="mt-2 text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("official.no_bracket_teams")}
              </p>
            )}

          {detailData && detailData.top_cut.length > 0 && (
            <TopCutBracket rounds={detailData.top_cut} sourceUrl={detailData.source_url} />
          )}

          {detail.isLoading && (
            <div
              className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px]"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg)",
                color: "var(--text-dim)",
              }}
            >
              <Loader2 size={12} className="animate-spin" />
              {t("official.loading_detail")}
            </div>
          )}

          {detail.isError && (
            <p
              className="mt-4 rounded-lg border px-3 py-2 text-[11px]"
              style={{
                borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))",
                backgroundColor: "color-mix(in srgb, var(--danger) 7%, transparent)",
                color: "var(--danger)",
              }}
            >
              {t("official.detail_error")}
            </p>
          )}

          <section className="mt-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text)" }}>
                {t(
                  standings.data?.source === "pokedata"
                    ? "official.standings_pokedata"
                    : "official.standings",
                )}
              </h3>
              {standings.data?.total_count != null && (
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                  {standings.data.total_count}
                </span>
              )}
              {standings.data?.source === "pokedata" && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-dim)",
                    backgroundColor: "var(--bg)",
                  }}
                  onClick={() => void openExternal(standings.data!.source_url ?? "https://www.pokedata.ovh/standings2/")}
                >
                  <ExternalLink size={9} />
                  {t("official.pokedata_standings")}
                </button>
              )}
            </div>
            {standings.isLoading && (
              <p className="flex items-center gap-1 text-xs" style={{ color: "var(--text-dim)" }}>
                <Loader2 size={12} className="animate-spin" />
                {t("official.loading_standings")}
              </p>
            )}
            {standings.isError && (
              <p className="text-xs" style={{ color: "var(--danger)" }}>
                {t("official.standings_error")}
              </p>
            )}
            {!standings.isLoading && !standings.isError && rows.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                {t("official.no_results")}
              </p>
            )}
            {rows.length > 0 && (
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <table className="w-full border-collapse text-[11px]">
                  <thead style={{ backgroundColor: "var(--bg-elev-strong)" }}>
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">#</th>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        {t("tournament.player")}
                      </th>
                      <th className="px-2 py-1.5 text-left font-semibold">
                        {t("tournament.record")}
                      </th>
                      <th className="w-8 px-1 py-1.5 text-center font-semibold">
                        <span className="sr-only">{t("official.rounds")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((row, index) => {
                      const rowKey = `${row.place ?? index}-${row.player_name}`;
                      const player = findPlayerMatches(
                        detailPlayers,
                        row.player_name,
                        row.country,
                        row.place,
                      );
                      const isOpen = expandedPlayers.has(rowKey);
                      const canExpand = Boolean(
                        player?.matches.length || player?.team.length,
                      );
                      const displayName = player?.player_name ?? row.player_name;
                      const displayCountry = player?.country ?? row.country;
                      return (
                        <Fragment key={rowKey}>
                          <tr
                            className="border-t"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <td className="px-2 py-1.5 font-mono" style={{ color: "var(--text-dim)" }}>
                              {row.place ?? "—"}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className="mr-1">{countryFlag(displayCountry)}</span>
                              {displayName}
                            </td>
                            <td className="px-2 py-1.5 font-mono" style={{ color: "var(--text-muted)" }}>
                              {row.record ?? "—"}
                            </td>
                            <td className="px-1 py-1 text-center">
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)] disabled:cursor-default disabled:opacity-25"
                                style={{ color: "var(--text-dim)" }}
                                onClick={() => togglePlayer(rowKey)}
                                disabled={!canExpand}
                                aria-expanded={canExpand ? isOpen : undefined}
                                aria-label={
                                  canExpand
                                    ? t(isOpen ? "official.hide_rounds" : "official.show_rounds", {
                                        player: displayName,
                                      })
                                    : undefined
                                }
                              >
                                <ChevronDown
                                  size={12}
                                  className={isOpen ? "rotate-180 transition-transform" : "transition-transform"}
                                />
                              </button>
                            </td>
                          </tr>
                          {isOpen && player && (
                            <tr>
                              <td colSpan={4} className="px-2 pb-2 pt-0">
                                <PlayerMatchHistory
                                  matches={player.matches}
                                  swissRounds={detailData?.swiss_rounds}
                                  team={player.team}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > visible && (
              <button
                type="button"
                className="btn-ghost mt-2 text-xs"
                onClick={() => setVisible((value) => value + 16)}
              >
                {t("common.see_more")}
              </button>
            )}
            {visible >= rows.length &&
              rows.length > 0 &&
              (standings.data?.total_count ?? rows.length) > rows.length && (
                <button
                  type="button"
                  className="btn-ghost mt-2 text-xs"
                  onClick={() => setPageSize((value) => Math.min(128, value + 32))}
                  disabled={standings.isFetching}
                >
                  {standings.isFetching ? (
                    <Loader2 size={12} className="mr-1 animate-spin" />
                  ) : null}
                  {t("official.load_more")}
                </button>
              )}
          </section>

          <p
            className="mt-4 border-t pt-2 text-[9px] leading-relaxed"
            style={{
              borderColor: "color-mix(in srgb, var(--border) 65%, transparent)",
              color: "var(--text-dim)",
            }}
          >
            {t("official.external_disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}

