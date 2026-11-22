import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { COUNTRY_CODES, countryFlag, countryName } from "../../lib/countries";
import { SearchSelect } from "../ui/SearchSelect";

interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

interface Props {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

/** Searchable single-country picker used by Settings. */
export function CountrySelect({ value, onChange, className }: Props) {
  const { i18n, t } = useTranslation();
  const options = useMemo<CountryOption[]>(() => {
    const countries: CountryOption[] = [...COUNTRY_CODES]
      .map((code) => ({
        code,
        name: countryName(code, i18n.language),
        flag: countryFlag(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const pinned = countries.find((country) => country.code === value);
    return pinned
      ? [pinned, ...countries.filter((country) => country.code !== value)]
      : countries;
  }, [i18n.language, value]);

  const selected =
    options.find((option) => option.code === value) ?? options[0];

  return (
    <SearchSelect<CountryOption>
      value={selected}
      options={options}
      onChange={(option) => {
        if (option) onChange(option.code);
      }}
      getOptionLabel={(option) => `${option.flag} ${option.name}`}
      getOptionKey={(option) => option.code}
      placeholder={t("settings.home_country_search")}
      emptyText={t("common.empty")}
      allowClear={false}
      className={className}
      triggerClassName="h-10"
    />
  );
}
