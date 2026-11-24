import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CityMultiFilter } from "./CityMultiFilter";
import { CountryFilter } from "../filters/CountryFilter";
import { useUiStore } from "../../stores/uiStore";
import { cn } from "../../lib/cn";
import type { UpcomingTournament } from "../../lib/types";

interface Props {
  events: UpcomingTournament[];
  availableCountries: ReadonlySet<string>;
  query: string;
  onQueryChange: (query: string) => void;
  className?: string;
  /** Limitless online events have no country/city. */
  showLocationFilters?: boolean;
}

/**
 * Multi-country + multi-city filters shared by the upcoming list and the
 * calendar. The city list is derived from the selected countries and is
 * grouped by country so equal city names stay distinct.
 */
export function UpcomingFilters({
  events,
  availableCountries,
  query,
  onQueryChange,
  className,
  showLocationFilters = true,
}: Props) {
  const { t } = useTranslation();
  const homeCountry = useUiStore((s) => s.homeCountry);
  const upcomingCountries = useUiStore((s) => s.upcomingCountries);
  const setUpcomingCountries = useUiStore((s) => s.setUpcomingCountries);
  const upcomingCities = useUiStore((s) => s.upcomingCities);
  const setUpcomingCities = useUiStore((s) => s.setUpcomingCities);

  const countryOptions = [
    ...new Set([...availableCountries, homeCountry].filter(Boolean)),
  ];

  const cities = events
    .filter(
      (event) =>
        event.city &&
        (upcomingCountries.length === 0 ||
          (event.country && upcomingCountries.includes(event.country))),
    )
    .map((event) => ({
      city: event.city as string,
      country: event.country,
    }));

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <div
          className="mb-1 text-[9px] uppercase tracking-wide"
          style={{ color: "var(--text-dim)" }}
        >
          {t("upcoming.filter_search")}
        </div>
        <div className="relative">
          <Search
            size={13}
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-dim)" }}
          />
          <input
            className="input h-9 w-full pl-8 pr-8 text-xs"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("upcoming.search_placeholder")}
            aria-label={t("upcoming.filter_search")}
            spellCheck={false}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md"
              style={{ color: "var(--text-dim)" }}
              onClick={() => onQueryChange("")}
              title={t("upcoming.clear_search")}
              aria-label={t("upcoming.clear_search")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {showLocationFilters && (
          <>
        <div className="min-w-[9rem] flex-1">
          <div
            className="mb-1 text-[9px] uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {t("upcoming.filter_country")}
          </div>
          <CountryFilter
            options={countryOptions}
            selected={upcomingCountries}
            onChange={setUpcomingCountries}
            placeholder={t("upcoming.all_countries")}
          />
        </div>
        <div className="min-w-[9rem] flex-1">
          <div
            className="mb-1 text-[9px] uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {t("upcoming.filter_city")}
          </div>
          <CityMultiFilter
            cities={cities}
            selected={upcomingCities}
            onChange={setUpcomingCities}
            placeholder={t("upcoming.all_cities")}
          />
        </div>
          </>
        )}
      </div>
    </div>
  );
}
