import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SearchSelect } from "../ui/SearchSelect";
import { COUNTRY_CODES, countryFlag, countryName } from "../../lib/countries";

interface CountryOption {
  code: string | null;
  name: string;
  flag: string;
}

interface Props {
  value: string | null;
  favorite: string | null;
  onChange: (code: string | null) => void;
  onFavoriteChange: (code: string) => void;
  /** ISO codes that currently have upcoming events. */
  availableCountries?: ReadonlySet<string>;
  className?: string;
}

/**
 * Searchable country picker for upcoming tournaments. `null` means "all
 * countries"; the starred country is pinned at the top (same interaction as
 * the favorite regulation star) and countries with real event data are listed
 * before the rest.
 */
export function CountryFilterSelect({
  value,
  favorite,
  onChange,
  onFavoriteChange,
  availableCountries,
  className,
}: Props) {
  const { t, i18n } = useTranslation();
  const options = useMemo<CountryOption[]>(() => {
    const all: CountryOption = {
      code: null,
      name: t("upcoming.all_countries"),
      flag: "🌎",
    };
    const countries: CountryOption[] = [...COUNTRY_CODES]
      .map((code) => ({
        code,
        name: countryName(code, i18n.language),
        flag: countryFlag(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const favoriteOption =
      countries.find((country) => country.code === favorite) ?? null;
    const available = availableCountries
      ? countries.filter(
          (country) =>
            country.code !== favorite &&
            availableCountries.has(country.code ?? ""),
        )
      : [];
    const rest = countries.filter(
      (country) =>
        country.code !== favorite &&
        !availableCountries?.has(country.code ?? ""),
    );
    return [
      all,
      ...(favoriteOption ? [favoriteOption] : []),
      ...available,
      ...rest,
    ];
  }, [availableCountries, favorite, i18n.language, t]);

  const selected = options.find((option) => option.code === value) ?? options[0];
  const favoriteOption =
    options.find((option) => option.code === favorite) ?? null;

  return (
    <SearchSelect<CountryOption>
      value={selected}
      options={options}
      onChange={(option) => onChange(option?.code ?? null)}
      getOptionLabel={(option) => `${option.flag} ${option.name}`}
      getOptionKey={(option) => option.code ?? "all"}
      renderOption={(option) => (
        <span className="flex min-w-0 items-center gap-1.5">
          {option.code && availableCountries?.has(option.code) && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: "var(--success)" }}
              aria-hidden
            />
          )}
          <span className="truncate">
            {option.flag} {option.name}
          </span>
        </span>
      )}
      favorite={favoriteOption}
      onFavoriteChange={(option) => {
        if (option.code) onFavoriteChange(option.code);
      }}
      favoriteTitle={t("upcoming.favorite_country")}
      placeholder={t("settings.home_country_search")}
      emptyText={t("common.empty")}
      allowClear={false}
      className={className}
    />
  );
}
