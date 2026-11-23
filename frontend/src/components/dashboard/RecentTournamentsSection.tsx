import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, MapPin, Swords, Trophy, Users } from "lucide-react";
import type { ChampionsTournament, Format } from "../../lib/types";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { countryFlag } from "../../lib/countries";
import {
  formatEventDateRange,
  formatDateTime,
} from "../../lib/formatDate";
import { formatLabel } from "../../lib/labels";
import { EventSourceBadge } from "./EventSourceBadge";
import { TournamentTierBadge } from "./TournamentTierBadge";
import { ChampionTeam } from "../tournament/ChampionTeam";
import { TournamentStandingsDrawer } from "../tournament/TournamentStandingsDrawer";
import { OfficialTournamentModal } from "../tournament/OfficialTournamentModal";
import { SearchTextInput } from "../filters/SearchTextInput";
import { CountryFilter } from "../filters/CountryFilter";
import { PanelLoading } from "../ui/PanelLoading";

interface Props {
  format: Format;
  from?: string | null;
  to?: string | null;
  limit?: number;
  className?: string;
}

const INITIAL = 10;
const PAGE = 10;

function isCommunity(tournament: ChampionsTournament): boolean {
  return (tournament.source ?? "limitless") !== "play-pokemon";
}

/**
 * Recent tournaments shared by the Feed and any other surface that needs the
 * same list. Official majors open the in-app result sheet; community events
 * keep the Limitless standings drawer with decklists and copy-to-builder.
 */
export function RecentTournamentsSection({
  format,
  from = null,
  to = null,
  limit = 30,
  className = "card",
}: Props) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string[]>([]);
  const [visible, setVisible] = useState(INITIAL);
  const [officialCollapsed, setOfficialCollapsed] = useState(false);
  const [communityCollapsed, setCommunityCollapsed] = useState(false);
  const [community, setCommunity] = useState<ChampionsTournament | null>(null);
  const [official, setOfficial] = useState<ChampionsTournament | null>(null);

  const report = useQuery({
    queryKey: queryKeys.championsReport(format, limit, from, to),
    queryFn: () => ipc.listChampionsTournaments(format, limit, from, to),
    staleTime: 30 * 60 * 1000,
  });

  const officialRows = report.data?.official_tournaments ?? [];
  const communityRows = useMemo(
    () =>
      (report.data?.tournaments ?? []).filter(
        (tournament) =>
          !(tournament.name ?? "").toUpperCase().includes("TCG") &&
          !(tournament.format ?? "").toUpperCase().includes("TCG"),
      ),
    [report.data],
  );
  const countryOptions = useMemo(
    () =>
      [
        ...new Set(
          communityRows
            .map((tournament) => tournament.champion_country?.toUpperCase())
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [communityRows],
  );
  const filteredCommunity = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return communityRows.filter((tournament) => {
      if (
        country.length > 0 &&
        (!tournament.champion_country ||
          !country.includes(tournament.champion_country.toUpperCase()))
      ) {
        return false;
      }
      if (!needle) return true;
      return (
        (tournament.name ?? "").toLowerCase().includes(needle) ||
        (tournament.champion_name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [communityRows, country, search]);
  const filteredOfficial = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return officialRows;
    return officialRows.filter(
      (tournament) =>
        tournament.name.toLowerCase().includes(needle) ||
        (tournament.champion_name ?? "").toLowerCase().includes(needle),
    );
  }, [officialRows, search]);
  const shown = filteredCommunity.slice(0, visible);

  return (
    <section className={className}>
      <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
        {t("dashboard.recent_tournaments")}
      </h2>
      <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
        {t("dashboard.tournaments_for_format", {
          format: formatLabel(t, format),
        })}
      </p>

      {report.isLoading && (
        <PanelLoading variant="list" rows={4} compact />
      )}
      {report.isError && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {t("common.error_with_detail", {
            detail: (report.error as Error)?.message ?? "unknown",
          })}
        </p>
      )}

      {filteredOfficial.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            className="mb-1.5 flex w-full items-center gap-2 text-left"
            style={{ color: "var(--text-muted)" }}
            title={officialCollapsed ? t("feed.expand") : t("feed.collapse")}
            aria-expanded={!officialCollapsed}
            onClick={() => setOfficialCollapsed((value) => !value)}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]">
              {officialCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </span>
            <Trophy size={12} style={{ color: "#f5c542" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text)" }}>
              {t("dashboard.official_tournaments")}
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {filteredOfficial.length}
            </span>
          </button>
          {!officialCollapsed && (
          <ul className="space-y-1.5">
            {filteredOfficial.map((tournament) => (
              <li
                key={tournament.id}
                className="rounded-lg border px-2.5 py-2"
                style={{
                  borderColor: "var(--border)",
                  borderLeft: "3px solid #f5c542",
                  backgroundColor: "color-mix(in srgb, #f5c542 7%, transparent)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {tournament.name}
                      </span>
                      <EventSourceBadge source="play-pokemon" />
                      <TournamentTierBadge tier={tournament.tier} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {tournament.date && (
                        <span>
                          {formatEventDateRange(tournament.date, tournament.end_date, i18n.language)}
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
                        <ChampionTeam tournament={tournament} />
                      )}
                    </div>
                    {tournament.prize_pool && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#f5c542" }}>
                        <Trophy size={10} />
                        {tournament.prize_pool}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost shrink-0 text-xs"
                    onClick={() => setOfficial(tournament)}
                  >
                    {t("dashboard.view_results")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>
      )}

      <button
        type="button"
        className="mb-1.5 flex w-full items-center gap-2 text-left"
        style={{ color: "var(--text-muted)" }}
        title={communityCollapsed ? t("feed.expand") : t("feed.collapse")}
        aria-expanded={!communityCollapsed}
        onClick={() => setCommunityCollapsed((value) => !value)}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]">
          {communityCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
        <Swords size={12} style={{ color: "#2b86ff" }} />
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text)" }}>
          {t("dashboard.community_tournaments")}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          {filteredCommunity.length}
        </span>
      </button>

      {!communityCollapsed && (
        <>
      {communityRows.length > 0 && (
        <div className="mb-2 flex flex-col gap-2 sm:flex-row">
          <SearchTextInput
            value={search}
            onChange={setSearch}
            placeholder={t("common.filter_search_tournament")}
          />
          <CountryFilter
            options={countryOptions}
            selected={country}
            onChange={setCountry}
            placeholder={t("common.filter_country_placeholder")}
            className="sm:w-64"
          />
        </div>
      )}

      {!report.isLoading && !report.isError && filteredCommunity.length === 0 && filteredOfficial.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("common.empty")}
        </p>
      )}

      {shown.length > 0 && (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {shown.map((tournament) => (
            <li key={tournament.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-[1_1_20rem]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                    {tournament.name}
                  </span>
                  <EventSourceBadge source={tournament.source ?? "limitless"} />
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {tournament.date && <span>{formatDateTime(tournament.date, i18n.language)}</span>}
                  {tournament.players != null && (
                    <span> · {tournament.players} {t("dashboard.players")}</span>
                  )}
                  {tournament.format && <span> · {tournament.format}</span>}
                  {tournament.champion_country && (
                    <span>
                      {" "}· {countryFlag(tournament.champion_country)}{" "}
                      {tournament.champion_country.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <ChampionTeam tournament={tournament} />
                <button
                  type="button"
                  className="btn-ghost shrink-0 text-xs"
                  onClick={() => setCommunity(tournament)}
                >
                  {t("dashboard.view_standings")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {filteredCommunity.length > visible && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setVisible((value) => value + PAGE)}
          >
            {t("dashboard.view_more")}
          </button>
        </div>
      )}
      {visible > INITIAL && (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setVisible(INITIAL)}
          >
            {t("dashboard.view_less")}
          </button>
        </div>
      )}
        </>
      )}

      <TournamentStandingsDrawer
        tournament={community}
        onClose={() => setCommunity(null)}
      />
      <OfficialTournamentModal
        tournament={official}
        onClose={() => setOfficial(null)}
      />
    </section>
  );
}
