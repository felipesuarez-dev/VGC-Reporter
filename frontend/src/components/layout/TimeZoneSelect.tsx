import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { systemTimeZone } from "../../lib/formatDate";
import { useUiStore } from "../../stores/uiStore";
import { SearchSelect } from "../ui/SearchSelect";

interface ZoneOption {
  value: string;
  label: string;
}

/**
 * Global timezone selector. `system` is the default and resolves to the
 * device zone at format time; every date/time formatter reads the same store,
 * so changing this updates the whole app (source tooltips, tournaments, news).
 * The list is searchable because IANA zones are numerous.
 */
export function TimeZoneSelect({ className }: { className?: string }) {
  const { t } = useTranslation();
  const timeZone = useUiStore((s) => s.timeZone);
  const setTimeZone = useUiStore((s) => s.setTimeZone);

  const options = useMemo<ZoneOption[]>(() => {
    const intl = Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    };
    const supported = intl.supportedValuesOf?.("timeZone") ?? [];
    const zones = [...new Set([...supported, "UTC", timeZone])]
      .filter((zone) => zone && zone !== "system")
      .sort();
    return [
      {
        value: "system",
        label: t("ui.timezone_system", { zone: systemTimeZone() }),
      },
      ...zones.map((zone) => ({ value: zone, label: zone })),
    ];
  }, [t, timeZone]);

  const selected =
    options.find((option) => option.value === timeZone) ?? options[0];

  return (
    <SearchSelect<ZoneOption>
      value={selected}
      options={options}
      onChange={(option) => {
        if (option) setTimeZone(option.value);
      }}
      getOptionLabel={(option) => option.label}
      getOptionKey={(option) => option.value}
      placeholder={t("settings.timezone_search")}
      emptyText={t("common.empty")}
      allowClear={false}
      className={className}
      triggerClassName="h-10"
    />
  );
}
