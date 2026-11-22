import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SearchSelect } from "../ui/SearchSelect";
import { countryFlag, countryName } from "../../lib/countries";
import { cityKey } from "../../lib/upcoming";

interface CityOption {
  value: string;
  label: string;
}

interface Props {
  value: string | null;
  onChange: (key: string | null) => void;
  cities: { city: string; country: string | null }[];
  className?: string;
}

/** Searchable city filter fed by the currently visible upcoming events. */
export function CityFilterSelect({
  value,
  onChange,
  cities,
  className,
}: Props) {
  const { t, i18n } = useTranslation();
  const options = useMemo<CityOption[]>(() => {
    const all: CityOption = {
      value: "",
      label: t("upcoming.all_cities"),
    };
    const byKey = new Map<string, { city: string; country: string | null }>();
    for (const entry of cities) {
      const key = cityKey(entry.city, entry.country);
      if (!byKey.has(key)) byKey.set(key, entry);
    }
    const multiCountry =
      new Set([...byKey.values()].map((entry) => entry.country).filter(Boolean))
        .size > 1;
    const rest = [...byKey.entries()]
      .map(([key, entry]) => ({
        value: key,
        label:
          multiCountry && entry.country
            ? `${entry.city} · ${countryFlag(entry.country)} ${countryName(
                entry.country,
                i18n.language,
              )}`
            : entry.city,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [all, ...rest];
  }, [cities, i18n.language, t]);

  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <SearchSelect<CityOption>
      value={selected}
      options={options}
      onChange={(option) => onChange(option?.value ? option.value : null)}
      getOptionLabel={(option) => option.label}
      getOptionKey={(option) => option.value || "all-cities"}
      placeholder={t("upcoming.search_city")}
      emptyText={t("common.empty")}
      allowClear={false}
      className={className}
    />
  );
}
