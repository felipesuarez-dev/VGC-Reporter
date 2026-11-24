import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RegulationInfo, UpcomingTournament } from "../../lib/types";
import {
  formatDate,
  formatDateTime,
  formatEventDateRange,
  formatTime,
} from "../../lib/formatDate";
import { downloadIcs } from "../../lib/calendar";
import {
  cityKey,
  eventAddress,
  eventDayKeys,
  isMajorEvent,
  matchesCities,
  matchesUpcomingQuery,
} from "../../lib/upcoming";
import { useCustomEventsStore } from "../../stores/customEventsStore";
import { useUpcomingTournaments } from "../../hooks/useUpcomingTournaments";
import { useUiStore } from "../../stores/uiStore";
import { UpcomingFilters } from "../layout/UpcomingFilters";
import { EventSourceBadge } from "./EventSourceBadge";
import { TournamentDetailModal } from "./TournamentDetailModal";
import { TournamentTierBadge } from "./TournamentTierBadge";
import { CustomEventModal } from "./CustomEventModal";
import { Pagination } from "../ui/Pagination";

interface Props {
  info: RegulationInfo;
}

type CalendarCategory = "official" | "community" | "personal";

const CATEGORY_COLORS: Record<CalendarCategory, string> = {
  official: "#f5c542",
  community: "#2b86ff",
  personal: "var(--accent)",
};

const DAY_GROUP_PAGE_SIZE = 6;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function parseDay(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Month view of the upcoming official/online events. Each event can be
 * downloaded as an `.ics` and opened in Google/Outlook/Apple Calendar; the
 * event row also opens the full in-app preview with address and map.
 */
export function FeedCalendar({ info }: Props) {
  const { t, i18n } = useTranslation();
  const upcomingCountries = useUiStore((s) => s.upcomingCountries);
  const upcomingCities = useUiStore((s) => s.upcomingCities);
  const setUpcomingCities = useUiStore((s) => s.setUpcomingCities);
  const timeZone = useUiStore((s) => s.timeZone);
  const { data, isLoading, isError, refetch, isFetching } =
    useUpcomingTournaments(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [dayTouched, setDayTouched] = useState(false);
  const [selectedEvent, setSelectedEvent] =
    useState<UpcomingTournament | null>(null);
  const [officialPage, setOfficialPage] = useState(1);
  const [communityPage, setCommunityPage] = useState(1);
  const [officialCollapsed, setOfficialCollapsed] = useState(false);
  const [communityCollapsed, setCommunityCollapsed] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDate, setCustomDate] = useState(() => dayKey(new Date()));
  const customEvents = useCustomEventsStore((s) => s.events);
  const removeCustomEvent = useCustomEventsStore((s) => s.removeEvent);

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
  const countryEvents = data ?? [];
  const events = useMemo(
    () =>
      countryEvents
        .filter((event) => matchesUpcomingQuery(event, query))
        .filter((event) => {
          const localOfficial =
            event.source === "play-pokemon" && !isMajorEvent(event);
          if (!localOfficial) return true;
          if (
            upcomingCountries.length > 0 &&
            (!event.country || !upcomingCountries.includes(event.country))
          ) {
            return false;
          }
          // The city filter belongs to official local events. Community
          // tournaments have no city, and majors are global; neither may be
          // hidden when the user filters their local scene.
          return matchesCities(event.city, event.country, upcomingCities);
        }),
    [countryEvents, query, upcomingCities, upcomingCountries],
  );
  const eventsByDate = useMemo(() => {
    const map = new Map<string, UpcomingTournament[]>();
    for (const event of events) {
      for (const day of eventDayKeys(event, timeZone)) {
        const list = map.get(day) ?? [];
        list.push(event);
        map.set(day, list);
      }
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          Number(isMajorEvent(b)) - Number(isMajorEvent(a)) ||
          (a.time ?? "").localeCompare(b.time ?? "") ||
          a.name.localeCompare(b.name),
      );
    }
    return map;
  }, [events, timeZone]);
  const majorDays = useMemo(() => {
    const days = new Set<string>();
    for (const [day, list] of eventsByDate) {
      if (list.some((event) => isMajorEvent(event))) days.add(day);
    }
    return days;
  }, [eventsByDate]);
  const customByDate = useMemo(() => {
    const map = new Map<string, typeof customEvents>();
    for (const event of customEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (a.time ?? "").localeCompare(b.time ?? "") ||
          a.title.localeCompare(b.title),
      );
    }
    return map;
  }, [customEvents]);

  const categoriesByDate = useMemo(() => {
    const map = new Map<string, Set<CalendarCategory>>();
    for (const [day, list] of eventsByDate) {
      const categories = map.get(day) ?? new Set<CalendarCategory>();
      for (const event of list) {
        categories.add(event.source === "play-pokemon" ? "official" : "community");
      }
      map.set(day, categories);
    }
    for (const day of customByDate.keys()) {
      const categories = map.get(day) ?? new Set<CalendarCategory>();
      categories.add("personal");
      map.set(day, categories);
    }
    return map;
  }, [customByDate, eventsByDate]);

  useEffect(() => {
    if (isLoading) return;
    const allowed = new Set(
      countryEvents
        .filter((event) => event.city)
        .map((event) => cityKey(event.city as string, event.country)),
    );
    const kept = upcomingCities.filter((key) => allowed.has(key));
    if (kept.length !== upcomingCities.length) setUpcomingCities(kept);
  }, [countryEvents, isLoading, setUpcomingCities, upcomingCities]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, monthIndex, 1 - offset + index);
    const key = dayKey(date);
    return {
      date,
      key,
      inMonth: date.getMonth() === monthIndex,
      count:
        (eventsByDate.get(key)?.length ?? 0) +
        (customByDate.get(key)?.length ?? 0),
    };
  });
  const weekdays = Array.from(
    { length: 7 },
    (_, index) => new Date(2024, 0, 1 + index),
  ).map((date) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: "narrow" }).format(date),
  );
  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    year: "numeric",
  }).format(month);
  const selectedEvents = eventsByDate.get(selectedDay) ?? [];
  const selectedCustom = customByDate.get(selectedDay) ?? [];
  const todayKey = dayKey(new Date());
  const selectedOfficial = selectedEvents.filter(
    (event) => event.source === "play-pokemon",
  );
  const selectedCommunity = selectedEvents.filter(
    (event) => event.source !== "play-pokemon",
  );
  const officialPageCount = Math.max(
    1,
    Math.ceil(selectedOfficial.length / DAY_GROUP_PAGE_SIZE),
  );
  const communityPageCount = Math.max(
    1,
    Math.ceil(selectedCommunity.length / DAY_GROUP_PAGE_SIZE),
  );
  const currentOfficialPage = Math.min(officialPage, officialPageCount);
  const currentCommunityPage = Math.min(communityPage, communityPageCount);
  const selectedOfficialPageRows = selectedOfficial.slice(
    (currentOfficialPage - 1) * DAY_GROUP_PAGE_SIZE,
    currentOfficialPage * DAY_GROUP_PAGE_SIZE,
  );
  const selectedCommunityPageRows = selectedCommunity.slice(
    (currentCommunityPage - 1) * DAY_GROUP_PAGE_SIZE,
    currentCommunityPage * DAY_GROUP_PAGE_SIZE,
  );
  useEffect(() => {
    setOfficialPage(1);
    setCommunityPage(1);
  }, [selectedDay, query, upcomingCountries, upcomingCities]);
  const season = info.active_season ?? info.seasons[info.seasons.length - 1];

  useEffect(() => {
    if (dayTouched || events.length === 0) return;
    if (eventsByDate.has(selectedDay)) return;
    const prefix = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
    const first = events
      .filter((event) => event.date.startsWith(prefix))
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time ?? "").localeCompare(b.time ?? ""),
      )[0];
    if (first) setSelectedDay(first.date);
  }, [dayTouched, events, eventsByDate, month, selectedDay]);

  const sourceLabel = (source: string) =>
    source === "play-pokemon"
      ? t("upcoming.source_official")
      : t("upcoming.source_limitless");

  const renderEventRow = (event: UpcomingTournament) => {
    const address = eventAddress(event);
    return (
      <li
        key={event.id}
        className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setSelectedEvent(event)}
          title={t("upcoming.preview")}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[11px] font-medium" style={{ color: "var(--text)" }}>
              {event.name}
            </span>
            <EventSourceBadge source={event.source} />
            <TournamentTierBadge tier={event.tier} />
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {event.starts_at || event.time
              ? `${formatTime(event.starts_at ?? event.time, i18n.language, timeZone)} · `
              : ""}
            {event.kind ? `${event.kind} · ` : ""}
            {event.end_date && event.end_date !== event.date
              ? `${formatEventDateRange(event.date, event.end_date, i18n.language)} · `
              : ""}
            {event.city ?? event.venue ?? ""}
          </div>
          {event.champion_name && (
            <div className="mt-0.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
              {t("upcoming.champion")}: {event.champion_name}
            </div>
          )}
          {event.prize_pool && (
            <div
              className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-semibold"
              style={{ color: "#f5c542" }}
              title={t("upcoming.prize_pool")}
            >
              <Trophy size={9} />
              {event.prize_pool}
            </div>
          )}
          {address && !isMajorEvent(event) && (
            <div className="mt-0.5 line-clamp-2 text-[9px]" style={{ color: "var(--text-dim)" }} title={address}>
              {address}
            </div>
          )}
        </button>
        <button
          type="button"
          className="btn-ghost h-7 w-7 shrink-0 p-0"
          onClick={() => downloadIcs(event, sourceLabel(event.source), i18n.language)}
          title={t("upcoming.export_ics")}
          aria-label={t("upcoming.export_ics")}
        >
          <CalendarPlus size={13} />
        </button>
      </li>
    );
  };

  const moveMonth = (delta: number) => {
    const next = new Date(year, monthIndex + delta, 1);
    setMonth(next);
    setSelectedDay(dayKey(next));
    setDayTouched(false);
  };

  return (
    <div>
      <UpcomingFilters
        events={countryEvents.filter((event) => !isMajorEvent(event))}
        availableCountries={availableCountries}
        query={query}
        onQueryChange={setQuery}
        className="mb-3"
      />

      <div className="mb-1.5 flex items-center justify-between gap-1">
        <button
          type="button"
          className="btn-ghost h-7 w-7 p-0"
          onClick={() => moveMonth(-1)}
          aria-label={t("upcoming.previous_month")}
          title={t("upcoming.previous_month")}
        >
          <ChevronLeft size={14} />
        </button>
        <span
          className="text-xs font-semibold first-letter:uppercase"
          style={{ color: "var(--text)" }}
        >
          {monthLabel}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="btn-ghost h-7 text-[10px]"
            onClick={() => {
              const today = new Date();
              setMonth(startOfMonth(today));
              setSelectedDay(dayKey(today));
              setDayTouched(false);
            }}
          >
            {t("upcoming.today")}
          </button>
          <button
            type="button"
            className="btn-ghost h-7 w-7 p-0"
            onClick={() => moveMonth(1)}
            aria-label={t("upcoming.next_month")}
            title={t("upcoming.next_month")}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div
        className="grid grid-cols-7 gap-1 text-center text-[9px] uppercase tracking-wide"
        style={{ color: "var(--text-dim)" }}
      >
        {weekdays.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const selected = cell.key === selectedDay;
          const isToday = cell.key === todayKey;
          const hasMajor = majorDays.has(cell.key);
          const categories = categoriesByDate.get(cell.key) ?? new Set();
          const tooltip = [
            ...(eventsByDate.get(cell.key) ?? []).map(
              (event) =>
                `${event.source === "play-pokemon" ? t("upcoming.source_official") : t("upcoming.source_limitless")}: ${event.name}`,
            ),
            ...(customByDate.get(cell.key) ?? []).map(
              (event) => `${t("calendar.personal")}: ${event.title}`,
            ),
          ].join(" · ");
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => {
                setSelectedDay(cell.key);
                setDayTouched(true);
                if (!cell.inMonth) setMonth(startOfMonth(cell.date));
              }}
              className="relative flex h-9 flex-col items-center justify-center rounded-md text-[10px] transition-colors hover:bg-[var(--bg-elev-strong)]"
              style={{
                backgroundColor: selected
                  ? "var(--accent-soft)"
                  : hasMajor
                    ? "color-mix(in srgb, #f5c542 13%, var(--bg-elev-strong))"
                    : cell.count > 0
                      ? "var(--bg-elev-strong)"
                      : "transparent",
                color: cell.inMonth ? "var(--text)" : "var(--text-dim)",
                border: selected
                  ? "2px solid var(--accent)"
                  : isToday
                    ? "1px solid var(--accent)"
                    : hasMajor
                      ? "1px solid color-mix(in srgb, #f5c542 55%, transparent)"
                      : "1px solid transparent",
              }}
              aria-label={`${formatDate(cell.key, i18n.language)}${tooltip ? `: ${tooltip}` : ""}`}
              aria-current={isToday ? "date" : undefined}
              title={tooltip || undefined}
              data-major={hasMajor ? "true" : undefined}
              data-today={isToday ? "true" : undefined}
            >
              <span className={isToday ? "font-bold" : undefined}>
                {cell.date.getDate()}
              </span>
              {cell.count > 0 && (
                <span className="absolute bottom-0.5 flex items-center gap-0.5">
                  {(["official", "community", "personal"] as const)
                    .filter((category) => categories.has(category))
                    .map((category) => (
                      <span
                        key={category}
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[category] }}
                        aria-hidden
                      />
                    ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>
            {formatDate(selectedDay, i18n.language)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {selectedEvents.length + selectedCustom.length}
            </span>
            <button
              type="button"
              className="btn-ghost h-7 text-[10px]"
              onClick={() => {
                setCustomDate(selectedDay);
                setCustomOpen(true);
              }}
            >
              <Plus size={12} className="mr-1" />
              {t("calendar.add_event")}
            </button>
          </div>
        </div>
        {isLoading ? (
          <p className="flex items-center gap-1 text-xs" style={{ color: "var(--text-dim)" }}>
            <Loader2 size={12} className="animate-spin" />
            {t("common.loading")}
          </p>
        ) : isError ? (
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {t("common.retry")}
          </button>
        ) : selectedEvents.length + selectedCustom.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("upcoming.no_events_day")}
          </p>
        ) : (
          <div className="space-y-3">
            {selectedOfficial.length > 0 && (
              <section>
                <button
                  type="button"
                  className="mb-1 flex w-full items-center gap-1.5 rounded-md py-0.5 text-left transition-colors hover:bg-[var(--bg-elev-strong)]"
                  onClick={() => setOfficialCollapsed((value) => !value)}
                  title={
                    officialCollapsed ? t("feed.expand") : t("feed.collapse")
                  }
                  aria-expanded={!officialCollapsed}
                  data-calendar-group="official"
                >
                  {officialCollapsed ? (
                    <ChevronRight
                      size={12}
                      style={{ color: "var(--text-dim)" }}
                    />
                  ) : (
                    <ChevronDown
                      size={12}
                      style={{ color: "var(--text-dim)" }}
                    />
                  )}
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.official }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    {t("upcoming.majors_title")}
                  </span>
                  <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>{selectedOfficial.length}</span>
                </button>
                {!officialCollapsed && (
                  <>
                    <ul className="space-y-1">{selectedOfficialPageRows.map(renderEventRow)}</ul>
                    <Pagination
                      page={currentOfficialPage}
                      pageCount={officialPageCount}
                      onChange={setOfficialPage}
                      className="mt-2 flex flex-wrap items-center justify-center gap-1"
                    />
                  </>
                )}
              </section>
            )}
            {selectedCommunity.length > 0 && (
              <section>
                <button
                  type="button"
                  className="mb-1 flex w-full items-center gap-1.5 rounded-md py-0.5 text-left transition-colors hover:bg-[var(--bg-elev-strong)]"
                  onClick={() => setCommunityCollapsed((value) => !value)}
                  title={
                    communityCollapsed ? t("feed.expand") : t("feed.collapse")
                  }
                  aria-expanded={!communityCollapsed}
                  data-calendar-group="community"
                >
                  {communityCollapsed ? (
                    <ChevronRight
                      size={12}
                      style={{ color: "var(--text-dim)" }}
                    />
                  ) : (
                    <ChevronDown
                      size={12}
                      style={{ color: "var(--text-dim)" }}
                    />
                  )}
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.community }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    {t("dashboard.community_tournaments")}
                  </span>
                  <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>{selectedCommunity.length}</span>
                </button>
                {!communityCollapsed && (
                  <>
                    <ul className="space-y-1">{selectedCommunityPageRows.map(renderEventRow)}</ul>
                    <Pagination
                      page={currentCommunityPage}
                      pageCount={communityPageCount}
                      onChange={setCommunityPage}
                      className="mt-2 flex flex-wrap items-center justify-center gap-1"
                    />
                  </>
                )}
              </section>
            )}
            {selectedCustom.length > 0 && (
              <section>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.personal }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    {t("calendar.personal")}
                  </span>
                  <span className="text-[9px]" style={{ color: "var(--text-dim)" }}>{selectedCustom.length}</span>
                </div>
                <ul className="space-y-1">
                  {selectedCustom.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5"
                      style={{
                        borderColor: "color-mix(in srgb, var(--accent) 45%, var(--border))",
                        backgroundColor: "color-mix(in srgb, var(--accent-soft) 35%, transparent)",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-[11px] font-medium" style={{ color: "var(--text)" }}>
                            {event.title}
                          </span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide"
                            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
                          >
                            {t("calendar.personal")}
                          </span>
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {event.time ? `${event.time} · ` : ""}
                          {event.location ?? ""}
                        </div>
                        {event.notes && (
                          <div className="mt-0.5 line-clamp-2 text-[9px]" style={{ color: "var(--text-dim)" }}>
                            {event.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-ghost h-7 w-7 shrink-0 p-0"
                        onClick={() => removeCustomEvent(event.id)}
                        title={t("calendar.delete_event")}
                        aria-label={t("calendar.delete_event")}
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <div
        className="mt-3 rounded-md border px-2 py-1.5 text-[10px]"
        style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
      >
        <div className="flex items-start gap-1">
          <CalendarDays size={10} className="mt-0.5 shrink-0" />
          <span>
            {season
              ? `${t("feed.season")} ${season.name}: ${formatDateTime(
                  season.start_at,
                  i18n.language,
                )} → ${formatDateTime(season.end_at, i18n.language)}`
              : t("feed.no_season")}
          </span>
        </div>
      </div>

      <TournamentDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
      {customOpen && (
        <CustomEventModal
          date={customDate}
          onClose={() => setCustomOpen(false)}
        />
      )}
    </div>
  );
}
