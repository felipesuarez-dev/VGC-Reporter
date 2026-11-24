import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PanelLoading } from "../ui/PanelLoading";
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  BadgeCheck,
  CalendarDays,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import {
  canonicalSpeciesId,
  type Format,
  type Pokemon,
  type RegulationInfo,
} from "../../lib/types";
import { usePokedexStore } from "../../stores/pokedexStore";
import { useItemDetailStore } from "../../stores/entityDetailStore";
import { useLocalize } from "../../hooks/useTranslations";
import { useDescribe } from "../../hooks/useEntityDescriptions";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { TypeBadge } from "../pokemon/TypeBadge";
import { ItemSprite } from "../items/ItemSprite";
import { EntityUsers } from "../info/EntityUsers";
import { buildEntityUsers, type EntityUser } from "../../lib/entityUsers";
import { prettifyItemName } from "../../lib/labels";
import { formatDate, formatDateTime } from "../../lib/formatDate";
import { dataDay, regulationStatusAt } from "../../lib/regulations";
import { PanelBoard, type PanelBoardItem } from "../layout/PanelBoard";
import {
  REGULATION_PANEL_IDS,
  useDashboardStore,
  type RegulationPanelId,
} from "../../stores/dashboardStore";

const INITIAL_SPECIES = 48;
const INITIAL_ITEMS = 36;

interface Props {
  format: Format;
  info: RegulationInfo | null;
}

type UsageSort = "usage" | "alphabetical";

export function RegulationInfoView({ format, info }: Props) {
  const regulationRows = useDashboardStore((s) => s.regulationRows);
  const regulationPanels = useDashboardStore((s) => s.regulationPanels);
  const setRegulationRows = useDashboardStore((s) => s.setRegulationRows);
  const setRegulationCollapsed = useDashboardStore(
    (s) => s.setRegulationCollapsed,
  );
  const setAllRegulationCollapsed = useDashboardStore(
    (s) => s.setAllRegulationCollapsed,
  );
  const resetRegulationLayout = useDashboardStore(
    (s) => s.resetRegulationLayout,
  );
  const { t, i18n } = useTranslation();
  const [speciesQuery, setSpeciesQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [visibleSpecies, setVisibleSpecies] = useState(INITIAL_SPECIES);
  const [showAllItems, setShowAllItems] = useState(false);
  const [speciesSort, setSpeciesSort] = useState<UsageSort>("usage");
  const [itemSort, setItemSort] = useState<UsageSort>("usage");

  useEffect(() => {
    setSpeciesQuery("");
    setItemQuery("");
    setVisibleSpecies(INITIAL_SPECIES);
    setShowAllItems(false);
  }, [info?.id]);

  const allowedSpecies = useQuery({
    queryKey: queryKeys.allowedSpecies(format),
    queryFn: () => ipc.getAllowedSpecies(format),
    staleTime: Infinity,
    enabled: Boolean(info),
  });
  const allowedItems = useQuery({
    queryKey: queryKeys.allowedItems(format),
    queryFn: () => ipc.getAllowedItems(format),
    staleTime: Infinity,
    enabled: Boolean(info),
  });
  const pokedex = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: Boolean(info),
  });
  const meta = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(info),
  });
  const localize = useLocalize();
  const describe = useDescribe();
  const openItem = useItemDetailStore((s) => s.open);
  const itemLabel = (name: string) => {
    const localized = localize("item", name);
    return localized === name ? prettifyItemName(name) : localized || name;
  };

  const byId = useMemo(() => {
    const map = new Map<string, Pokemon>();
    for (const pokemon of pokedex.data ?? []) {
      map.set(canonicalSpeciesId(pokemon.name), pokemon);
    }
    return map;
  }, [pokedex.data]);

  const entries = useMemo(() => {
    return (allowedSpecies.data ?? []).map((name) => ({
      name,
      pokemon: byId.get(canonicalSpeciesId(name)) ?? null,
    }));
  }, [allowedSpecies.data, byId]);

  const megas = useMemo(
    () => entries.filter((entry) => /mega/i.test(entry.name)),
    [entries],
  );

  const query = speciesQuery.trim().toLowerCase();
  const usageBySpecies = useMemo(() => {
    const map = new Map<string, number>();
    for (const pokemon of meta.data?.pokemon ?? []) {
      const key = canonicalSpeciesId(pokemon.species);
      const previous = map.get(key);
      if (previous === undefined || pokemon.usage_percent > previous) {
        map.set(key, pokemon.usage_percent);
      }
    }
    return map;
  }, [meta.data]);
  const usageByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of meta.data?.top_items ?? []) {
      const key = canonicalSpeciesId(item.name);
      const previous = map.get(key);
      if (previous === undefined || item.usage_percent > previous) {
        map.set(key, item.usage_percent);
      }
    }
    return map;
  }, [meta.data]);
  const usersByItem = useMemo(
    () => buildEntityUsers(meta.data?.pokemon ?? [], "top_items", 5),
    [meta.data],
  );
  const filtered = entries.filter(
    (entry) => !query || entry.name.toLowerCase().includes(query),
  );
  const sortedSpecies = [...filtered].sort((a, b) => {
    if (speciesSort === "alphabetical") return a.name.localeCompare(b.name);
    const aUsage = usageBySpecies.get(canonicalSpeciesId(a.name));
    const bUsage = usageBySpecies.get(canonicalSpeciesId(b.name));
    return (
      (bUsage ?? -1) - (aUsage ?? -1) || a.name.localeCompare(b.name)
    );
  });
  const items = useMemo(() => allowedItems.data ?? [], [allowedItems.data]);
  const itemLabels = new Map(items.map((name) => [name, itemLabel(name)]));
  const itemSearch = itemQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!itemSearch) return true;
    const label = itemLabels.get(item) ?? item;
    return (
      label.toLowerCase().includes(itemSearch) ||
      item.toLowerCase().includes(itemSearch)
    );
  });
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aLabel = itemLabels.get(a) ?? a;
    const bLabel = itemLabels.get(b) ?? b;
    if (itemSort === "alphabetical") return aLabel.localeCompare(bLabel);
    const aUsage = usageByItem.get(canonicalSpeciesId(a));
    const bUsage = usageByItem.get(canonicalSpeciesId(b));
    return (bUsage ?? -1) - (aUsage ?? -1) || aLabel.localeCompare(bLabel);
  });
  const visibleItems =
    showAllItems || itemSearch
      ? sortedItems
      : sortedItems.slice(0, INITIAL_ITEMS);

  if (!info) {
    return (
      <section className="card">
        <PanelLoading variant="cards" rows={3} />
      </section>
    );
  }

  const status = regulationStatusAt(info);
  const season =
    info.active_season ?? info.seasons[info.seasons.length - 1] ?? null;
  const seasonStart = season?.start_at ?? info.start_at;
  const seasonEnd = season?.end_at ?? info.end_at;
  const seasonRange = season
    ? `${formatDateTime(seasonStart, i18n.language)} → ${formatDateTime(
        seasonEnd,
        i18n.language,
      )}`
    : null;
  const regulationRange = `${formatDateTime(info.start_at, i18n.language)} → ${
    info.end_at
      ? formatDateTime(info.end_at, i18n.language)
      : t("feed.ongoing")
  }`;
  const dataFrom = dataDay(seasonStart, "start");
  const dataTo = dataDay(seasonEnd, "end");
  const sourceValidated = info.warnings.find(
    (warning) => warning.kind === "source_validated",
  );
  const calendarPending = info.warnings.some(
    (warning) => warning.kind === "calendar_pending",
  );

  const regulationItems: Record<RegulationPanelId, PanelBoardItem> = {
    roster: {
      label: t("feed.eligible_pokemon"),
      icon: <ShieldCheck size={12} />,
    },
    items: {
      label: t("feed.allowed_items"),
      icon: <Package size={12} />,
    },
    megas: {
      label: t("feed.eligible_megas"),
      icon: <Sparkles size={12} />,
    },
  };

  return (
    <div className="space-y-4">
      <header className="card card-hero relative overflow-hidden p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                }}
              >
                {status === "active"
                  ? t("regulations.active")
                  : status === "upcoming"
                    ? t("regulations.coming_soon")
                    : t("regulations.archived")}
              </span>
              <span
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                <BadgeCheck size={11} />
                {info.origin === "official"
                  ? t("feed.official")
                  : t("regulations.source_validated")}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  backgroundColor: "var(--bg-elev-strong)",
                  color: "var(--text-muted)",
                }}
              >
                {t("regulations.confidence_label", {
                  level: t(`regulations.confidence_${info.confidence}`),
                })}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold" style={{ color: "var(--text)" }}>
              {t("regulations.set_label", { code: info.code })}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {season
                ? `${t("feed.season")} ${season.name}${seasonRange ? ` · ${seasonRange}` : ""}`
                : t("feed.no_season")}
            </p>
            {dataFrom && (
              <p
                className="mt-1 flex flex-wrap items-center gap-1 text-[11px]"
                style={{ color: "var(--text-dim)" }}
                title={t("feed.data_days_hint")}
              >
                <CalendarDays size={12} />
                {t("feed.data_days", {
                  from: formatDate(dataFrom, i18n.language),
                  to: dataTo
                    ? formatDate(dataTo, i18n.language)
                    : t("feed.ongoing"),
                })}
              </p>
            )}
            <p
              className="mt-2 flex flex-wrap items-center gap-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <CalendarDays size={14} />
              <span>{t("feed.regulation_dates")}: {regulationRange}</span>
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
            <Stat
              icon={<Sparkles size={13} />}
              label={t("feed.eligible_pokemon")}
              value={allowedSpecies.data?.length ?? info.eligible_count}
            />
            <Stat
              icon={<Sparkles size={13} />}
              label={t("feed.new_megas")}
              value={info.new_megas.length}
            />
            <Stat
              icon={<ShieldCheck size={13} />}
              label={t("feed.sources")}
              value={info.sources.length}
            />
            <Stat
              icon={<CalendarDays size={13} />}
              label={t("feed.seasons")}
              value={info.seasons.length}
            />
          </div>
        </div>

        {(sourceValidated || calendarPending) && (
          <p
            className="mt-3 rounded-lg border px-3 py-2 text-[11px]"
            style={{
              borderColor: "var(--warning)",
              color: "var(--warning)",
              backgroundColor: "color-mix(in srgb, var(--warning) 8%, transparent)",
            }}
          >
            {sourceValidated
              ? sourceValidated.kind === "source_validated"
                ? t("regulations.source_validated_banner", {
                    teams: sourceValidated.teams,
                    count: sourceValidated.source_count,
                  })
                : null
              : t("regulations.calendar_pending")}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {info.sources.map((source) => (
            <span
              key={source.source}
              className="rounded-full border px-2 py-0.5 text-[10px]"
              style={{
                borderColor: source.verified ? "var(--accent)" : "var(--border)",
                color: source.verified ? "var(--accent)" : "var(--text-muted)",
                backgroundColor: "var(--bg-elev-strong)",
              }}
              title={source.detail ?? undefined}
            >
              {t(`sources.name_${source.source}`)}
              {source.verified ? " ✓" : ""}
            </span>
          ))}
        </div>
      </header>

      <PanelBoard
        rows={regulationRows}
        panelIds={REGULATION_PANEL_IDS}
        items={regulationItems}
        prefs={regulationPanels}
        onRowsChange={setRegulationRows}
        onToggle={setRegulationCollapsed}
        onAllCollapsed={setAllRegulationCollapsed}
        onReset={resetRegulationLayout}
        renderPanel={(panelId) => {
          if (panelId === "roster") {
            return (
        <section className="card">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {t("feed.eligible_pokemon")}{" "}
                <span style={{ color: "var(--text-dim)" }}>({filtered.length})</span>
              </h3>
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("feed.eligible_hint")}
              </p>
            </div>
            <SortTabs value={speciesSort} onChange={setSpeciesSort} />
          </div>
          <div className="relative mb-3 w-full">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-dim)" }}
            />
            <input
              className="input h-9 w-full pl-8 text-xs"
              value={speciesQuery}
              onChange={(event) => {
                setSpeciesQuery(event.target.value);
                setVisibleSpecies(INITIAL_SPECIES);
              }}
              placeholder={t("feed.search_pokemon")}
            />
          </div>
          {allowedSpecies.isLoading && (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("common.loading")}
            </p>
          )}
          {filtered.length === 0 && !allowedSpecies.isLoading && (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("feed.no_results")}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
            {sortedSpecies.slice(0, visibleSpecies).map((entry) => (
              <PokemonTile
                key={entry.name}
                entry={entry}
                usage={
                  meta.isLoading
                    ? undefined
                    : usageBySpecies.get(canonicalSpeciesId(entry.name))
                }
              />
            ))}
          </div>
          {filtered.length > visibleSpecies && (
            <button
              type="button"
              className="btn-ghost mt-3 w-full text-xs"
              onClick={() => setVisibleSpecies((count) => count + INITIAL_SPECIES)}
            >
              {t("common.see_more")}
            </button>
          )}
        </section>
            );
          }
          if (panelId === "items") {
            return (
        <section className="card" data-section="allowed-items">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--text)" }}
              >
                {t("feed.allowed_items")}{" "}
                <span style={{ color: "var(--text-dim)" }}>
                  ({filteredItems.length})
                </span>
              </h3>
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("feed.items_hint")}
              </p>
            </div>
            <SortTabs value={itemSort} onChange={setItemSort} />
          </div>
          <div className="relative mb-3 w-full">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-dim)" }}
            />
            <input
              className="input h-9 w-full pl-8 text-xs"
              value={itemQuery}
              onChange={(event) => {
                setItemQuery(event.target.value);
                setShowAllItems(false);
              }}
              placeholder={t("feed.search_item")}
            />
          </div>
          {allowedItems.isLoading && (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("common.loading")}
            </p>
          )}
          {filteredItems.length === 0 && !allowedItems.isLoading && (
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("feed.no_results")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => {
              const users = usersByItem.get(canonicalSpeciesId(item)) ?? [];
              return (
                <ItemTile
                  key={item}
                  name={item}
                  label={itemLabels.get(item) ?? item}
                  description={describe("item", item)}
                  usage={
                    meta.isLoading
                      ? undefined
                      : usageByItem.get(canonicalSpeciesId(item))
                  }
                  users={users.slice(0, 3)}
                  onOpen={() => openItem(item, users)}
                />
              );
            })}
          </div>
          {!itemSearch && filteredItems.length > INITIAL_ITEMS && (
            <button
              type="button"
              className="btn-ghost mt-2 w-full text-xs"
              onClick={() => setShowAllItems((value) => !value)}
            >
              {showAllItems ? t("common.see_less") : t("common.see_more")}
            </button>
          )}
        </section>
            );
          }
          return (
          <section className="card">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {t("feed.eligible_megas")}{" "}
              <span style={{ color: "var(--text-dim)" }}>({megas.length})</span>
            </h3>
            <p className="mb-2 text-[10px]" style={{ color: "var(--text-dim)" }}>
              {t("feed.megas_hint")}
            </p>
            {megas.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                {t("feed.no_megas")}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {megas.map((entry) => (
                  <PokemonTile
                    key={entry.name}
                    entry={entry}
                    compact
                    usage={
                      meta.isLoading
                        ? undefined
                        : usageBySpecies.get(canonicalSpeciesId(entry.name))
                    }
                  />
                ))}
              </div>
            )}
            {info.new_megas.length > 0 && (
              <p className="mt-2 text-[10px]" style={{ color: "var(--accent)" }}>
                {t("feed.new_megas")}: {info.new_megas.join(" · ")}
              </p>
            )}
          </section>
          );
        }}
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div
      className="rounded-lg border px-2.5 py-2"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
      }}
    >
      <div
        className="flex items-center gap-1 text-[9px] uppercase tracking-wide"
        style={{ color: "var(--text-dim)" }}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

function SortTabs({
  value,
  onChange,
}: {
  value: UsageSort;
  onChange: (value: UsageSort) => void;
}) {
  const { t } = useTranslation();
  const options: {
    id: UsageSort;
    icon: typeof ArrowDownWideNarrow;
    label: string;
  }[] = [
    {
      id: "usage",
      icon: ArrowDownWideNarrow,
      label: t("regulations.sort_usage"),
    },
    {
      id: "alphabetical",
      icon: ArrowDownAZ,
      label: t("regulations.sort_alphabetical"),
    },
  ];
  return (
    <div
      role="tablist"
      aria-label={t("regulations.sort")}
      className="flex overflow-hidden rounded-md border"
      style={{ borderColor: "var(--border)" }}
    >
      {options.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          title={label}
          aria-label={label}
          onClick={() => onChange(id)}
          className="flex h-9 w-9 items-center justify-center transition-colors"
          style={{
            backgroundColor:
              value === id ? "var(--accent-soft)" : "transparent",
            color: value === id ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

function ItemTile({
  name,
  label,
  description,
  usage,
  users,
  onOpen,
}: {
  name: string;
  label: string;
  description: string | null;
  usage?: number;
  users: EntityUser[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={description ? `${label} · ${description}` : label}
      className="group flex min-w-0 flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-[var(--accent)]"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="flex w-full min-w-0 items-center gap-2">
        <ItemSprite name={name} size={28} />
        <span
          className="min-w-0 flex-1 truncate text-[11px] font-medium group-hover:text-[var(--accent)]"
          style={{ color: "var(--text)" }}
        >
          {label}
        </span>
        <span
          className="shrink-0 text-[10px] font-semibold tabular-nums"
          style={{ color: usage ? "var(--accent)" : "var(--text-dim)" }}
        >
          {usage != null ? `${usage.toFixed(1)}%` : "—"}
        </span>
      </span>
      <EntityUsers users={users} />
    </button>
  );
}

function PokemonTile({
  entry,
  compact = false,
  usage,
}: {
  entry: { name: string; pokemon: Pokemon | null };
  compact?: boolean;
  usage?: number;
}) {
  const openDetail = usePokedexStore((state) => state.openDetail);
  const size = compact ? 46 : 58;
  return (
    <button
      type="button"
      onClick={() => entry.pokemon && openDetail(entry.pokemon.id)}
      disabled={!entry.pokemon}
      className="group flex min-w-0 flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors hover:border-[var(--accent)] disabled:cursor-default"
      style={{ borderColor: "var(--border)" }}
      title={entry.name}
    >
      {entry.pokemon ? (
        <PokemonSprite
          url={entry.pokemon.sprite_url}
          fallbackUrl={entry.pokemon.sprite_fallback_url}
          homeUrl={entry.pokemon.home_sprite_url}
          name={entry.pokemon.name}
          size={size}
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full text-[10px]"
          style={{
            width: size,
            height: size,
            backgroundColor: "var(--bg-elev-strong)",
            color: "var(--text-dim)",
          }}
        >
          ?
        </span>
      )}
      <span
        className="w-full truncate text-center text-[10px] font-medium group-hover:text-[var(--accent)]"
        style={{ color: "var(--text)" }}
      >
        {entry.name}
      </span>
      <span
        className="text-[9px] font-semibold tabular-nums"
        style={{ color: usage ? "var(--accent)" : "var(--text-dim)" }}
      >
        {usage != null ? `${usage.toFixed(1)}%` : "—"}
      </span>
      {usage != null && (
        <span
          className="h-0.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--bg-elev-strong)" }}
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.min(Math.max(usage, 0), 100)}%`,
              backgroundColor: "var(--accent)",
            }}
          />
        </span>
      )}
      {entry.pokemon && !compact && (
        <span className="flex max-w-full gap-0.5 overflow-hidden">
          {entry.pokemon.types.slice(0, 2).map((type) => (
            <TypeBadge key={type} type={type} />
          ))}
        </span>
      )}
    </button>
  );
}
