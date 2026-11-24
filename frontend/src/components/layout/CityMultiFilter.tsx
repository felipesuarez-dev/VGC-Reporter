import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, X } from "lucide-react";
import { Command } from "cmdk";
import { countryFlag, countryName } from "../../lib/countries";
import { cityKey, parseCityKey } from "../../lib/upcoming";
import { cn } from "../../lib/cn";

interface CityOption {
  key: string;
  city: string;
  country: string | null;
}

interface Props {
  cities: { city: string; country: string | null }[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Multi-city picker grouped by country. The list is fed by the countries
 * selected in the sibling filter; each group carries its flag/name so cities
 * with the same name in different countries stay distinguishable.
 */
export function CityMultiFilter({
  cities,
  selected,
  onChange,
  placeholder,
  className,
}: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = useMemo(() => {
    const byKey = new Map<string, CityOption>();
    for (const entry of cities) {
      const key = cityKey(entry.city, entry.country);
      if (!byKey.has(key)) {
        byKey.set(key, { key, city: entry.city, country: entry.country });
      }
    }
    const byCountry = new Map<string | null, CityOption[]>();
    for (const option of byKey.values()) {
      const list = byCountry.get(option.country) ?? [];
      list.push(option);
      byCountry.set(option.country, list);
    }
    return [...byCountry.entries()]
      .map(([country, list]) => ({
        country,
        label: country
          ? `${countryFlag(country)} ${countryName(country, i18n.language)}`
          : t("upcoming.all_countries"),
        cities: list.sort((a, b) => a.city.localeCompare(b.city)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cities, i18n.language, t]);

  const selectedOptions = useMemo(
    () =>
      selected
        .map((key) => {
          const parsed = parseCityKey(key);
          return parsed
            ? {
                key,
                city: parsed.city,
                country: parsed.country,
              }
            : null;
        })
        .filter((entry): entry is CityOption => Boolean(entry)),
    [selected],
  );

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((entry) => entry !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="input flex min-h-[2.25rem] w-full items-center justify-between gap-2"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-xs">
          {selectedOptions.length === 0 ? (
            <span style={{ color: "var(--text-dim)" }}>
              {placeholder ?? t("upcoming.all_cities")}
            </span>
          ) : (
            selectedOptions.map((entry) => (
              <span
                key={entry.key}
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                {entry.country && <span>{countryFlag(entry.country)}</span>}
                <span className="max-w-32 truncate">{entry.city}</span>
                {entry.country && (
                  <span
                    className="text-[9px]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {entry.country}
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(entry.key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.stopPropagation();
                      toggle(entry.key);
                    }
                  }}
                  className="ml-0.5 cursor-pointer rounded-sm p-0.5 hover:bg-[var(--bg-elev-strong)]"
                  aria-label={`Remove ${entry.city}`}
                >
                  <X size={10} />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown size={14} style={{ color: "var(--text-dim)" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-md border shadow-lg"
          style={{
            backgroundColor: "var(--bg-elev-strong)",
            borderColor: "var(--border)",
          }}
        >
          <Command label={t("upcoming.search_city")} className="flex flex-col">
            <Command.Input
              autoFocus
              placeholder={t("upcoming.search_city")}
              className="w-full border-b bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-dim)]"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            />
            <Command.List className="max-h-64 overflow-y-auto">
              <Command.Empty
                className="px-3 py-3 text-center text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                {t("common.empty")}
              </Command.Empty>
              {selected.length > 0 && (
                <Command.Item
                  value="__all_cities__ clear"
                  onSelect={() => onChange([])}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("upcoming.all_cities")}
                </Command.Item>
              )}
              {groups.map((group) => (
                <Command.Group
                  key={group.country ?? "unknown"}
                  heading={group.label}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
                >
                  {group.cities.map((option) => {
                    const active = selected.includes(option.key);
                    return (
                      <Command.Item
                        key={option.key}
                        value={`${option.city} ${group.label} ${option.key}`}
                        onSelect={() => toggle(option.key)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs",
                          "aria-selected:bg-[var(--bg-elev)]",
                          active && "font-semibold",
                        )}
                        style={{ color: "var(--text)" }}
                      >
                        <span className="flex-1 truncate">{option.city}</span>
                        {option.country && (
                          <span
                            className="text-[9px]"
                            style={{ color: "var(--text-dim)" }}
                          >
                            {countryFlag(option.country)} {option.country}
                          </span>
                        )}
                        {active && (
                          <Check size={12} style={{ color: "var(--accent)" }} />
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
