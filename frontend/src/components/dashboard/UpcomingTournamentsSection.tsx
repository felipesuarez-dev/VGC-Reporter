import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Eye, Globe2, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  formatDate,
  formatEventDateRange,
  formatTime,
} from "../../lib/formatDate";
import { countryFlag } from "../../lib/countries";
import {
  eventAddress,
  isMajorEvent,
  matchesCity,
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
import { cn } from "../../lib/cn";

type UpcomingTab = "official" | "limitless";

interface Props {
  /** Only show events for this regulation code (for example `M-C`). */
  formatCode?: string | null;
  limit?: number;
  className?: string;
}

/**
 * Upcoming VGC events: Limitless online tournaments plus in-person Play!
 * Pokémon League Challenges/Cups. The row opens an in-app preview with the
 * full address, map, contact details and official page.
 */
export function UpcomingTournamentsSection({
  formatCode,
  limit,
  className = "card",
}: Props) {
  const { t, i18n } = useTranslation();
  const upcomingCountry = useUiStore((s) => s.upcomingCountry);
  const upcomingCity = useUiStore((s) => s.upcomingCity);
  const setUpcomingCity = useUiStore((s) => s.setUpcomingCity);
  const timeZone = useUiStore((s) => s.timeZone);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<UpcomingTab>("official");
  const [selected, setSelected] = useState<UpcomingTournament | null>(null);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useUpcomingTournaments(upcomingCountry);
  const allCountries = useUpcomingTournaments(null);

  const availableCountries = useMemo(
    () =>
      new Set(
        (allCountries.data ?? [])
          .filter((event) => !isMajorEvent(event))
          .map((event) => event.country)
          .filter((code): code is string => Boolean(code)),
      ),
    [allCountries.data],
  );
  const countryEvents = useMemo(() => data ?? [], [data]);
  const { official: officialEvents, limitless: limitlessEvents } = useMemo(
    () => splitUpcomingEvents(countryEvents),
    [countryEvents],
  );
  const activeEvents =
    tab === "official" ? officialEvents : limitlessEvents;
  const cities = useMemo(
    () =>
      officialEvents
        .filter((event) => !isMajorEvent(event) && event.city)
        .map((event) => ({
          city: event.city as string,
          country: event.country,
        })),
    [officialEvents],
  );

  useEffect(() => {
    if (!upcomingCity || isLoading) return;
    const exists = officialEvents.some((event) =>
      matchesCity(event.city, event.country, upcomingCity),
    );
    if (!exists) setUpcomingCity(null);
  }, [isLoading, officialEvents, setUpcomingCity, upcomingCity]);

  const filteredEvents = activeEvents
    .filter((event) => !formatCode || !event.region || event.region === formatCode)
    .filter((event) => matchesUpcomingQuery(event, query))
    .filter((event) =>
      tab === "official"
        ? isMajorEvent(event) ||
          !upcomingCountry ||
          event.country === upcomingCountry
        : true,
    )
    .filter((event) =>
      tab === "official"
        ? isMajorEvent(event) ||
          matchesCity(event.city, event.country, upcomingCity)
        : true,
    );
  const events = limit ? filteredEvents.slice(0, limit) : filteredEvents;
  const majorEvents =
    tab === "official" ? events.filter((event) => isMajorEvent(event)) : [];
  const localEvents =
    tab === "official"
      ? events.filter((event) => !isMajorEvent(event))
      : events;
  const emptyKey =
    tab === "official"
      ? upcomingCountry || upcomingCity
        ? "upcoming.empty_filtered"
        : "upcoming.empty_official"
      : "upcoming.empty_limitless";

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
          <Eye
            size={13}
            className="mt-1 shrink-0"
            style={{ color: "var(--text-dim)" }}
            aria-hidden
          />
        </button>
      </li>
    );
  };

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
                count: officialEvents.length,
              },
              {
                id: "limitless" as const,
                icon: Globe2,
                label: t("upcoming.tab_limitless"),
                count: limitlessEvents.length,
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
                onClick={() => {
                  setTab(entry.id);
                  setUpcomingCity(null);
                }}
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

      {isLoading && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("common.loading")}
        </p>
      )}
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
      {!isLoading && !isError && events.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t(emptyKey)}
        </p>
      )}
      {tab === "official" && majorEvents.length > 0 && (
        <div className="mb-1 flex items-center gap-2">
          <Trophy size={12} style={{ color: "#f5c542" }} />
          <h3
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text)" }}
          >
            {t("upcoming.majors_title")}
          </h3>
          <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {majorEvents.length}
          </span>
        </div>
      )}
      {majorEvents.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {majorEvents.map(renderEvent)}
        </ul>
      )}
      {tab === "official" && localEvents.length > 0 && (
        <div className="mb-1 mt-4 flex items-center gap-2">
          <BadgeCheck size={12} style={{ color: "var(--accent)" }} />
          <h3
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text)" }}
          >
            {t("upcoming.locals_title")}
          </h3>
          <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {localEvents.length}
          </span>
        </div>
      )}
      {localEvents.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {localEvents.map(renderEvent)}
        </ul>
      )}

      <TournamentDetailModal
        event={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
