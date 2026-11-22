import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../lib/formatDate";
import { countryFlag } from "../../lib/countries";
import {
  eventAddress,
  matchesCity,
  matchesUpcomingQuery,
} from "../../lib/upcoming";
import { useUpcomingTournaments } from "../../hooks/useUpcomingTournaments";
import { useUiStore } from "../../stores/uiStore";
import type { UpcomingTournament } from "../../lib/types";
import { UpcomingFilters } from "../layout/UpcomingFilters";
import { EventSourceBadge } from "./EventSourceBadge";
import { TournamentDetailModal } from "./TournamentDetailModal";

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
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UpcomingTournament | null>(null);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useUpcomingTournaments(upcomingCountry);
  const allCountries = useUpcomingTournaments(null);

  const availableCountries = useMemo(
    () =>
      new Set(
        (allCountries.data ?? [])
          .map((event) => event.country)
          .filter((code): code is string => Boolean(code)),
      ),
    [allCountries.data],
  );
  const countryEvents = useMemo(() => data ?? [], [data]);
  const cities = useMemo(
    () =>
      countryEvents
        .filter((event) => event.city)
        .map((event) => ({
          city: event.city as string,
          country: event.country,
        })),
    [countryEvents],
  );

  useEffect(() => {
    if (!upcomingCity || isLoading) return;
    const exists = countryEvents.some((event) =>
      matchesCity(event.city, event.country, upcomingCity),
    );
    if (!exists) setUpcomingCity(null);
  }, [countryEvents, isLoading, setUpcomingCity, upcomingCity]);

  const events = countryEvents
    .filter((event) => !formatCode || !event.region || event.region === formatCode)
    .filter((event) => matchesUpcomingQuery(event, query))
    .filter((event) => matchesCity(event.city, event.country, upcomingCity))
    .slice(0, limit ?? undefined);

  return (
    <section className={className}>
      <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
        {t("upcoming.title")}
      </h2>
      <p className="mb-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
        {t("upcoming.window")}
      </p>

      <UpcomingFilters
        events={countryEvents}
        availableCountries={availableCountries}
        query={query}
        onQueryChange={setQuery}
        className="mb-3"
      />

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
          {t("upcoming.empty")}
        </p>
      )}
      {events.length > 0 && (
        <ul className="divide-y divide-[var(--border)]">
          {events.map((event) => {
            const address = eventAddress(event);
            return (
            <li key={event.id}>
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
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span>{formatDate(event.date, i18n.language)}</span>
                    {event.time && <span> · {event.time.slice(0, 5)}</span>}
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
                    {event.region && <span> · {event.region}</span>}
                  </div>
                  {address && (
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
          })}
        </ul>
      )}

      <TournamentDetailModal
        event={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
