import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";
import type { ChampionsTournament, Format } from "../../lib/types";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { countryFlag } from "../../lib/countries";
import { formatEventDateRange, formatDateTime } from "../../lib/formatDate";
import { formatLabel } from "../../lib/labels";
import { EventSourceBadge } from "./EventSourceBadge";
import { TournamentTierBadge } from "./TournamentTierBadge";
import { ChampionTeam } from "../tournament/ChampionTeam";
import { TournamentStandingsDrawer } from "../tournament/TournamentStandingsDrawer";
import { OfficialTournamentModal } from "../tournament/OfficialTournamentModal";
import { SearchTextInput } from "../filters/SearchTextInput";
import { CountryFilter } from "../filters/CountryFilter";
import { useHomeCountryFilter } from "../../hooks/useHomeCountryFilter";
import { PanelLoading } from "../ui/PanelLoading";
import { Pagination } from "../ui/Pagination";

interface Props {
  format: Format;
  from?: string | null;
  to?: string | null;
  limit?: number;
  className?: string;
}

const PAGE_SIZE = 10;

function isCommunity(tournament: ChampionsTournament): boolean {
  return (tournament.source ?? "limitless") !== "play-pokemon";
}

function countriesOf(rows: ChampionsTournament[]): string[] {
  return [
    ...new Set(
      rows
        .map((tournament) =>
          (tournament.country ?? tournament.champion_country)?.toUpperCase(),
        )
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
}

function filterRows(
  rows: ChampionsTournament[],
  search: string,
  countries: string[],
): ChampionsTournament[] {
  const needle = search.trim().toLowerCase();
  return rows.filter((tournament) => {
    const eventCountry = tournament.country ?? tournament.champion_country;
    if (
      countries.length > 0 &&
      (!eventCountry || !countries.includes(eventCountry.toUpperCase()))
    ) {
      return false;
    }
    if (!needle) return true;
    return [
      tournament.name,
      tournament.champion_name,
      tournament.location,
      tournament.tier,
    ].some((value) => (value ?? "").toLowerCase().includes(needle));
  });
}

function GroupFilters({
  search,
  onSearch,
  country,
  onCountry,
  countryOptions,
}: {
  search: string;
  onSearch: (value: string) => void;
  country: string[];
  onCountry: (value: string[]) => void;
  countryOptions: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <div
          className="mb-1 text-[9px] uppercase tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          {t("upcoming.filter_search")}
        </div>
        <SearchTextInput
          value={search}
          onChange={onSearch}
          placeholder={t("common.filter_search_tournament")}
        />
      </div>
      <div className="sm:w-64">
        <div
          className="mb-1 text-[9px] uppercase tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          {t("upcoming.filter_country")}
        </div>
        <CountryFilter
          options={countryOptions}
          selected={country}
          onChange={onCountry}
          placeholder={t("common.filter_country_placeholder")}
        />
      </div>
    </div>
  );
}

/**
 * Recent tournaments shared by the Panel and Top Teams. Official and
 * community events have independent filters and pagination; the whole row is
 * the trigger, so it works with mouse, keyboard and touch.
 */
export function RecentTournamentsSection({
  format,
  from = null,
  to = null,
  limit = 60,
  className = "card",
}: Props) {
  const { t, i18n } = useTranslation();
  const [officialSearch, setOfficialSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [officialPage, setOfficialPage] = useState(1);
  const [communityPage, setCommunityPage] = useState(1);
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
          !(tournament.format ?? "").toUpperCase().includes("TCG") &&
          isCommunity(tournament),
      ),
    [report.data],
  );
  const officialCountryCodes = useMemo(
    () =>
      officialRows
        .map((tournament) => tournament.country?.toUpperCase())
        .filter((code): code is string => Boolean(code)),
    [officialRows],
  );
  const communityCountryCodes = useMemo(
    () =>
      communityRows
        .map((tournament) => tournament.champion_country?.toUpperCase())
        .filter((code): code is string => Boolean(code)),
    [communityRows],
  );
  const {
    selected: officialCountry,
    setSelected: setOfficialCountry,
    homeCountry,
  } = useHomeCountryFilter(officialCountryCodes, 1);
  const {
    selected: communityCountry,
    setSelected: setCommunityCountry,
  } = useHomeCountryFilter(communityCountryCodes, 1);
  const officialCountryOptions = useMemo(() => {
    const list = countriesOf(officialRows);
    return list.includes(homeCountry)
      ? list
      : [...list, homeCountry].sort();
  }, [homeCountry, officialRows]);
  const communityCountryOptions = useMemo(() => {
    const list = countriesOf(communityRows);
    return list.includes(homeCountry)
      ? list
      : [...list, homeCountry].sort();
  }, [communityRows, homeCountry]);
  const filteredOfficial = useMemo(
    () => filterRows(officialRows, officialSearch, officialCountry),
    [officialCountry, officialRows, officialSearch],
  );
  const filteredCommunity = useMemo(
    () => filterRows(communityRows, communitySearch, communityCountry),
    [communityCountry, communityRows, communitySearch],
  );
  const officialPageCount = Math.max(
    1,
    Math.ceil(filteredOfficial.length / PAGE_SIZE),
  );
  const communityPageCount = Math.max(
    1,
    Math.ceil(filteredCommunity.length / PAGE_SIZE),
  );
  const currentOfficialPage = Math.min(officialPage, officialPageCount);
  const currentCommunityPage = Math.min(communityPage, communityPageCount);
  const officialPageRows = filteredOfficial.slice(
    (currentOfficialPage - 1) * PAGE_SIZE,
    currentOfficialPage * PAGE_SIZE,
  );
  const communityPageRows = filteredCommunity.slice(
    (currentCommunityPage - 1) * PAGE_SIZE,
    currentCommunityPage * PAGE_SIZE,
  );

  useEffect(() => {
    setOfficialPage(1);
  }, [officialSearch, officialCountry]);
  useEffect(() => {
    setCommunityPage(1);
  }, [communitySearch, communityCountry]);

  const renderGroupHeader = (
    key: "official" | "community",
    icon: ReactNode,
    label: string,
    total: number,
    collapsed: boolean,
    onToggle: () => void,
  ) => (
    <button
      type="button"
      className="mb-1 flex w-full items-center gap-2 text-left"
      style={{ color: "var(--text-muted)" }}
      title={collapsed ? t("feed.expand") : t("feed.collapse")}
      aria-expanded={!collapsed}
      onClick={onToggle}
      data-recent-group={key}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-elev-strong)]">
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </span>
      {icon}
      <span
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text)" }}
      >
        {label}
      </span>
      <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
        {total}
      </span>
    </button>
  );

  const renderRow = (
    tournament: ChampionsTournament,
    source: "official" | "community",
  ) => {
    const isOfficial = source === "official";
    return (
      <li key={tournament.id}>
        <button
          type="button"
          className="group flex w-full items-start gap-3 border-t py-2.5 text-left transition-colors hover:bg-[var(--bg-elev-strong)]"
          style={{
            borderColor: "var(--border)",
            borderLeft: isOfficial ? "3px solid #f5c542" : "3px solid #2b86ff",
            paddingLeft: "0.65rem",
            backgroundColor: isOfficial
              ? "color-mix(in srgb, #f5c542 5%, transparent)"
              : "color-mix(in srgb, #2b86ff 5%, transparent)",
          }}
          onClick={() => (isOfficial ? setOfficial(tournament) : setCommunity(tournament))}
          title={t("upcoming.preview")}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="truncate text-sm font-medium group-hover:text-[var(--accent)]"
                style={{ color: "var(--text)" }}
              >
                {tournament.name}
              </span>
              <EventSourceBadge source={tournament.source ?? (isOfficial ? "play-pokemon" : "limitless")} />
              {isOfficial && <TournamentTierBadge tier={tournament.tier} />}
            </div>
            <div
              className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              {tournament.date && (
                <span>
                  {isOfficial
                    ? formatEventDateRange(
                        tournament.date,
                        tournament.end_date,
                        i18n.language,
                      )
                    : formatDateTime(tournament.date, i18n.language)}
                </span>
              )}
              {isOfficial && tournament.location && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin size={10} />
                  <span className="truncate">
                    {tournament.country ? `${countryFlag(tournament.country)} ` : ""}
                    {tournament.location}
                  </span>
                </span>
              )}
              {tournament.players != null && (
                <span className="inline-flex items-center gap-1">
                  <Users size={10} />
                  {tournament.players} {t("dashboard.players")}
                </span>
              )}
              {!isOfficial && tournament.format && (
                <span>{tournament.format}</span>
              )}
            </div>
            <div className="mt-0.5 flex min-h-[1.1rem] flex-wrap items-center gap-x-2 gap-y-0.5 leading-none">
              {isOfficial && tournament.prize_pool && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: "#f5c542" }}
                >
                  <Trophy size={10} />
                  {tournament.prize_pool}
                </span>
              )}
              <ChampionTeam tournament={tournament} />
            </div>
          </div>
          <span
            className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px] font-medium"
            style={{ color: "var(--accent)" }}
          >
            {t("dashboard.view_results")}
            <ChevronRight size={13} />
          </span>
        </button>
      </li>
    );
  };

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

      {report.isLoading && <PanelLoading variant="list" rows={4} compact />}
      {report.isError && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {t("common.error_with_detail", {
            detail: (report.error as Error)?.message ?? "unknown",
          })}
        </p>
      )}

      {!report.isLoading &&
        !report.isError &&
        filteredOfficial.length === 0 &&
        filteredCommunity.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("common.empty")}
          </p>
        )}

      <div className="mb-5">
        {renderGroupHeader(
          "official",
          <Trophy size={12} style={{ color: "#f5c542" }} />,
          t("dashboard.official_tournaments"),
          filteredOfficial.length,
          officialCollapsed,
          () => setOfficialCollapsed((value) => !value),
        )}
        {!officialCollapsed && (
          <>
            <GroupFilters
              search={officialSearch}
              onSearch={setOfficialSearch}
              country={officialCountry}
              onCountry={setOfficialCountry}
              countryOptions={officialCountryOptions}
            />
            {officialPageRows.length > 0 ? (
              <ul>{officialPageRows.map((tournament) => renderRow(tournament, "official"))}</ul>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {t("common.empty")}
                </p>
                {officialCountry.length > 0 && (
                  <button
                    type="button"
                    className="btn-ghost h-7 text-[10px]"
                    onClick={() => setOfficialCountry([])}
                  >
                    {t("upcoming.all_countries")}
                  </button>
                )}
              </div>
            )}
            <Pagination
              page={currentOfficialPage}
              pageCount={officialPageCount}
              onChange={setOfficialPage}
            />
          </>
        )}
      </div>

      <div>
        {renderGroupHeader(
          "community",
          <Users size={12} style={{ color: "#2b86ff" }} />,
          t("dashboard.community_tournaments"),
          filteredCommunity.length,
          communityCollapsed,
          () => setCommunityCollapsed((value) => !value),
        )}
        {!communityCollapsed && (
          <>
            <GroupFilters
              search={communitySearch}
              onSearch={setCommunitySearch}
              country={communityCountry}
              onCountry={setCommunityCountry}
              countryOptions={communityCountryOptions}
            />
            {communityPageRows.length > 0 ? (
              <ul>{communityPageRows.map((tournament) => renderRow(tournament, "community"))}</ul>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {t("common.empty")}
                </p>
                {communityCountry.length > 0 && (
                  <button
                    type="button"
                    className="btn-ghost h-7 text-[10px]"
                    onClick={() => setCommunityCountry([])}
                  >
                    {t("upcoming.all_countries")}
                  </button>
                )}
              </div>
            )}
            <Pagination
              page={currentCommunityPage}
              pageCount={communityPageCount}
              onChange={setCommunityPage}
            />
          </>
        )}
      </div>

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
