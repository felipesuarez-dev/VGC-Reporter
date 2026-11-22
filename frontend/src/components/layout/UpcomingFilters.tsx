import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CountryFilterSelect } from "./CountryFilterSelect";
import { CityFilterSelect } from "./CityFilterSelect";
import { useUiStore } from "../../stores/uiStore";
import { cn } from "../../lib/cn";
import type { UpcomingTournament } from "../../lib/types";

interface Props {
  events: UpcomingTournament[];
  availableCountries: ReadonlySet<string>;
  query: string;
  onQueryChange: (query: string) => void;
  className?: string;
}

/**
 * Country + city filters shared by the upcoming list and the calendar.
 * Starring a country promotes it to the top of the country picker (same
 * favorite interaction as the regulation selector) and selects it.
 */
export function UpcomingFilters({
  events,
  availableCountries,
  query,
  onQueryChange,
  className,
}: Props) {
  const { t } = useTranslation();
  const upcomingCountry = useUiStore((s) => s.upcomingCountry);
  const setUpcomingCountry = useUiStore((s) => s.setUpcomingCountry);
  const favoriteCountry = useUiStore((s) => s.favoriteUpcomingCountry);
  const setFavoriteCountry = useUiStore(
    (s) => s.setFavoriteUpcomingCountry,
  );
  const upcomingCity = useUiStore((s) => s.upcomingCity);
  const setUpcomingCity = useUiStore((s) => s.setUpcomingCity);

  const cities = events
    .filter((event) => event.city)
    .map((event) => ({
      city: event.city as string,
      country: event.country,
    }));

  const selectCountry = (code: string | null) => {
    setUpcomingCountry(code);
    setUpcomingCity(null);
  };

  const toggleFavorite = (code: string) => {
    if (favoriteCountry === code) {
      setFavoriteCountry(null);
      if (upcomingCountry === code) setUpcomingCountry(null);
      setUpcomingCity(null);
      return;
    }
    setFavoriteCountry(code);
    setUpcomingCountry(code);
    setUpcomingCity(null);
  };

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
        <div className="min-w-[9rem] flex-1">
          <div
            className="mb-1 text-[9px] uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {t("upcoming.filter_country")}
          </div>
          <CountryFilterSelect
            value={upcomingCountry}
            favorite={favoriteCountry}
            onChange={selectCountry}
            onFavoriteChange={toggleFavorite}
            availableCountries={availableCountries}
          />
        </div>
        <div className="min-w-[9rem] flex-1">
          <div
            className="mb-1 text-[9px] uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {t("upcoming.filter_city")}
          </div>
          <CityFilterSelect
            value={upcomingCity}
            onChange={setUpcomingCity}
            cities={cities}
          />
        </div>
      </div>
    </div>
  );
}
