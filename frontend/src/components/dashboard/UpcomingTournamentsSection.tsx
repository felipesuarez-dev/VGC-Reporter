import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Eye,
  Globe2,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  formatDate,
  formatEventDateRange,
  formatTime,
} from "../../lib/formatDate";
import { countryFlag } from "../../lib/countries";
import {
  cityKey,
  eventAddress,
  isMajorEvent,
  matchesCities,
  matchesUpcomingQuery,
  splitUpcomingEvents,
} from "../../lib/upcoming";
import { useUpcomingTournaments } from "../../hooks/useUpcomingTournaments";
import { useUiStore } from "../../stores/uiStore";
import type { UpcomingTournament } from "../../lib/types";
import { UpcomingFilters } from "../layout/UpcomingFilters";
import { EventSourceBadge } from "./EventSourceBadge";
import { TournamentDetailModal } from "./TournamentDetailModal";
import { TournamentTierBadge } from "./TournamentTierBadge";
import { PanelLoading } from "../ui/PanelLoading";
import { Pagination } from "../ui/Pagination";
import { cn } from "../../lib/cn";

type UpcomingTab = "official" | "limitless";

const PAGE_SIZE = 10;

interface Props {
  /** Only show events for this regulation code (for example `M-C`). */
  formatCode?: string | null;
  className?: string;
}

/**
 * Upcoming VGC events: Limitless online tournaments plus in-person Play!
 * Pokémon League Challenges/Cups and Championship Series majors. The list is
 * filtered over the full dataset and paginated 10 at a time; the old hidden
 * `limit` (which made Chile look like it only had eight events) is gone.
 */
export function UpcomingTournamentsSection({
  formatCode,
  className = "card",
}: Props) {
  const { t, i18n } = useTranslation();
  const upcomingCountries = useUiStore((s) => s.upcomingCountries);
  const upcomingCities = useUiStore((s) => s.upcomingCities);
  const setUpcomingCities = useUiStore((s) => s.setUpcomingCities);
  const timeZone = useUiStore((s) => s.timeZone);
  const [officialQuery, setOfficialQuery] = useState("");
  const [limitlessQuery, setLimitlessQuery] = useState("");
  const [tab, setTab] = useState<UpcomingTab>("official");
  const [majorsPage, setMajorsPage] = useState(1);
  const [localsPage, setLocalsPage] = useState(1);
  const [limitlessPage, setLimitlessPage] = useState(1);
  const [selected, setSelected] = useState<UpcomingTournament | null>(null);
  const [majorsCollapsed, setMajorsCollapsed] = useState(false);
  const [localsCollapsed, setLocalsCollapsed] = useState(false);
  const [limitlessCollapsed, setLimitlessCollapsed] = useState(false);
  const query = tab === "official" ? officialQuery : limitlessQuery;
  const setQuery = tab === "official" ? setOfficialQuery : setLimitlessQuery;
  const { data, isLoading, isError, error, refetch, isFetching } =
    useUpcomingTournaments(null);

  const availableCountries = useMemo(
    () =>
      new Set(
        (data ?? [])
          .filter((event) => !isMajorEvent(event))
          .map((event) => event.country)
          .filter((code): code is string => Boolean(code)),
      ),
    [data],
  );
  const countryEvents = useMemo(() => data ?? [], [data]);
  const { official: officialEvents, limitless: limitlessEvents } = useMemo(
    () => splitUpcomingEvents(countryEvents),
    [countryEvents],
  );

  useEffect(() => {
    if (isLoading) return;
    const allowed = new Set(
      officialEvents
        .filter((event) => event.city)
        .map((event) => cityKey(event.city as string, event.country)),
    );
    const kept = upcomingCities.filter((key) => allowed.has(key));
    if (kept.length !== upcomingCities.length) setUpcomingCities(kept);
  }, [isLoading, officialEvents, setUpcomingCities, upcomingCities]);

  const filteredOfficial = useMemo(
    () =>
      officialEvents
        .filter((event) => !formatCode || !event.region || event.region === formatCode)
        .filter((event) => matchesUpcomingQuery(event, query))
        .filter(
          (event) =>
            isMajorEvent(event) ||
            upcomingCountries.length === 0 ||
            (event.country != null &&
              upcomingCountries.includes(event.country)),
        )
        .filter(
          (event) =>
            isMajorEvent(event) ||
            matchesCities(event.city, event.country, upcomingCities),
        ),
    [formatCode, officialEvents, query, upcomingCities, upcomingCountries],
  );
  const filteredLimitless = useMemo(
    () =>
      limitlessEvents
        .filter((event) => !formatCode || !event.region || event.region === formatCode)
        .filter((event) => matchesUpcomingQuery(event, query)),
    [formatCode, limitlessEvents, query],
  );

  const filteredMajors = useMemo(
    () => filteredOfficial.filter((event) => isMajorEvent(event)),
    [filteredOfficial],
  );
  const filteredLocals = useMemo(
    () => filteredOfficial.filter((event) => !isMajorEvent(event)),
    [filteredOfficial],
  );
  const majorsPageCount = Math.max(
    1,
    Math.ceil(filteredMajors.length / PAGE_SIZE),
  );
  const localsPageCount = Math.max(
    1,
    Math.ceil(filteredLocals.length / PAGE_SIZE),
  );
  const limitlessPageCount = Math.max(
    1,
    Math.ceil(filteredLimitless.length / PAGE_SIZE),
  );
  const currentMajorsPage = Math.min(majorsPage, majorsPageCount);
  const currentLocalsPage = Math.min(localsPage, localsPageCount);
  const currentLimitlessPage = Math.min(limitlessPage, limitlessPageCount);
  const majorEvents = filteredMajors.slice(
    (currentMajorsPage - 1) * PAGE_SIZE,
    currentMajorsPage * PAGE_SIZE,
  );
  const localEvents = filteredLocals.slice(
    (currentLocalsPage - 1) * PAGE_SIZE,
    currentLocalsPage * PAGE_SIZE,
  );
  const limitlessEventsPage = filteredLimitless.slice(
    (currentLimitlessPage - 1) * PAGE_SIZE,
    currentLimitlessPage * PAGE_SIZE,
  );
  const emptyKey =
    tab === "official"
      ? upcomingCountries.length > 0 || upcomingCities.length > 0 || query
        ? "upcoming.empty_filtered"
        : "upcoming.empty_official"
      : "upcoming.empty_limitless";

  useEffect(() => {
    setMajorsPage(1);
    setLocalsPage(1);
    setLimitlessPage(1);
  }, [tab, query, upcomingCountries, upcomingCities, formatCode]);

  const selectTab = (next: UpcomingTab) => {
    setTab(next);
    setMajorsPage(1);
    setLocalsPage(1);
    setLimitlessPage(1);
    if (next === "official") setUpcomingCities([]);
  };

  const renderEvent = (event: UpcomingTournament) => {
    const address = eventAddress(event);
    const major = isMajorEvent(event);
    return (
      <li
        key={event.id}
        style={
          major
            ? {
                borderLeft: "3px solid var(--accent)",
                paddingLeft: "0.65rem",
                backgroundColor:
                  "color-mix(in srgb, var(--accent-soft) 28%, transparent)",
              }
            : undefined
        }
        data-major={major ? "true" : undefined}
      >
        <button
          type="button"
          onClick={() => setSelected(event)}
          title={t("upcoming.preview")}
          className="group flex w-full items-start justify-between gap-3 py-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="truncate text-sm font-medium group-hover:text-[var(--accent)]"
                style={{ color: "var(--text)" }}
              >
                {event.name}
              </span>
              <EventSourceBadge source={event.source} />
              <TournamentTierBadge tier={event.tier} />
            </div>
            <div
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              <span>
                {event.starts_at
                  ? formatDate(event.starts_at, i18n.language, timeZone)
                  : formatEventDateRange(
                      event.date,
                      event.end_date,
                      i18n.language,
                    )}
              </span>
              {(event.starts_at || event.time) && (
                <span>
                  {" "}
                  · {formatTime(event.starts_at ?? event.time, i18n.language, timeZone)}
                </span>
              )}
              {event.kind && <span> · {event.kind}</span>}
              {event.city && (
                <span>
                  {" "}
                  · {countryFlag(event.country)} {event.city}
                </span>
              )}
              {event.players != null && (
                <span>
                  {" "}
                  · {event.players} {t("dashboard.players")}
                </span>
              )}
              {event.champion_name && (
                <span>
                  {" "}
                  · {t("upcoming.champion")}:{" "}
                  {event.champion_country
                    ? `${countryFlag(event.champion_country)} `
                    : ""}
                  {event.champion_name}
                </span>
              )}
              {event.registrations != null && (
                <span>
                  {" "}
                  · {event.registrations} {t("upcoming.registrations")}
                </span>
              )}
              {event.region && <span> · {event.region}</span>}
            </div>
            {event.prize_pool && (
              <div
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: "#f5c542" }}
                title={t("upcoming.prize_pool")}
              >
                <Trophy size={10} />
                {event.prize_pool}
              </div>
            )}
            {address && !major && (
              <div
                className="mt-0.5 line-clamp-2 text-[10px]"
                style={{ color: "var(--text-dim)" }}
                title={address}
              >
                {address}
              </div>
            )}
          </div>
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            style={{ color: "var(--text-dim)" }}
            aria-hidden
          >
            <Eye size={14} />
          </span>
        </button>
      </li>
    );
  };

  const renderGroupHeader = (
    key: "majors" | "locals" | "limitless",
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
      data-upcoming-group={key}
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

  return (
    <section className={className}>
      <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
        {t("upcoming.title")}
      </h2>
      <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
        {t("upcoming.window")}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div
          className="flex overflow-hidden rounded-lg border"
          style={{ borderColor: "var(--border)" }}
          role="tablist"
          aria-label={t("upcoming.title")}
        >
          {(
            [
              {
                id: "official" as const,
                icon: BadgeCheck,
                label: t("upcoming.tab_official"),
                count: filteredOfficial.length,
              },
              {
                id: "limitless" as const,
                icon: Globe2,
                label: t("upcoming.tab_limitless"),
                count: filteredLimitless.length,
              },
            ] as const
          ).map((entry) => {
            const Icon = entry.icon;
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(entry.id)}
                className={cn(
                  "flex h-8 items-center gap-1.5 px-3 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)]",
                )}
              >
                <Icon size={13} />
                {entry.label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{
                    backgroundColor: active
                      ? "var(--accent)"
                      : "var(--bg-elev-strong)",
                    color: active
                      ? "var(--accent-contrast, #fff)"
                      : "var(--text-dim)",
                  }}
                >
                  {entry.count}
                </span>
              </button>
            );
          })}
        </div>
        <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          {tab === "official"
            ? t("upcoming.tab_official_hint")
            : t("upcoming.tab_limitless_hint")}
        </span>
      </div>

      <UpcomingFilters
        events={
          tab === "official"
            ? officialEvents.filter((event) => !isMajorEvent(event))
            : limitlessEvents
        }
        availableCountries={availableCountries}
        query={query}
        onQueryChange={setQuery}
        showLocationFilters={tab === "official"}
        className="mb-3"
      />

      {tab === "limitless" && (
        <p
          className="mb-3 rounded-lg border px-2.5 py-2 text-[10px]"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-elev-strong)",
            color: "var(--text-muted)",
          }}
        >
          {t("upcoming.limitless_note")}
        </p>
      )}

      {isLoading && <PanelLoading variant="list" rows={4} compact />}
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
      {!isLoading &&
        !isError &&
        (tab === "official"
          ? filteredOfficial.length === 0
          : filteredLimitless.length === 0) && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t(emptyKey)}
          </p>
        )}

      {tab === "official" && filteredMajors.length > 0 && (
        <div className="mb-1">
          {renderGroupHeader(
            "majors",
            <Trophy size={12} style={{ color: "#f5c542" }} />,
            t("upcoming.majors_title"),
            filteredMajors.length,
            majorsCollapsed,
            () => setMajorsCollapsed((value) => !value),
          )}
          {!majorsCollapsed && (
            <>
              <ul className="divide-y divide-[var(--border)]">
                {majorEvents.map(renderEvent)}
              </ul>
              <Pagination
                page={currentMajorsPage}
                pageCount={majorsPageCount}
                onChange={setMajorsPage}
              />
            </>
          )}
        </div>
      )}

      {tab === "official" && filteredLocals.length > 0 && (
        <div className="mb-1 mt-3">
          {renderGroupHeader(
            "locals",
            <BadgeCheck size={12} style={{ color: "var(--accent)" }} />,
            t("upcoming.locals_title"),
            filteredLocals.length,
            localsCollapsed,
            () => setLocalsCollapsed((value) => !value),
          )}
          {!localsCollapsed && (
            <>
              <ul className="divide-y divide-[var(--border)]">
                {localEvents.map(renderEvent)}
              </ul>
              <Pagination
                page={currentLocalsPage}
                pageCount={localsPageCount}
                onChange={setLocalsPage}
              />
            </>
          )}
        </div>
      )}

      {tab === "limitless" && filteredLimitless.length > 0 && (
        <div>
          {renderGroupHeader(
            "limitless",
            <Globe2 size={12} style={{ color: "#2b86ff" }} />,
            t("upcoming.tab_limitless"),
            filteredLimitless.length,
            limitlessCollapsed,
            () => setLimitlessCollapsed((value) => !value),
          )}
          {!limitlessCollapsed && (
            <>
              <ul className="divide-y divide-[var(--border)]">
                {limitlessEventsPage.map(renderEvent)}
              </ul>
              <Pagination
                page={currentLimitlessPage}
                pageCount={limitlessPageCount}
                onChange={setLimitlessPage}
              />
            </>
          )}
        </div>
      )}

      <TournamentDetailModal
        event={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
