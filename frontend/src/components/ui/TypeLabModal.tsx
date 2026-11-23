import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dna, Grid3x3, Search, Shield, ShieldCheck, Swords, X } from "lucide-react";
import { ALL_TYPES, canonicalSpeciesId, type PokemonType } from "../../lib/types";
import { natureLabel, statLabel, typeLabel, type StatKey } from "../../lib/labels";
import {
  NATURE_BOOSTS,
  NATURE_EFFECTS,
  type NatureEffect,
  type NatureStat,
} from "../../lib/natures";
import {
  defensiveMultiplier,
  offensiveCoverage,
  resistancesOf,
  weaknessesOf,
} from "../../lib/typeChart";
import { useTypeLabStore, type TypeLabTab } from "../../stores/typeLabStore";
import { treemapTextColor } from "../../lib/treemap";
import { useTeamBuilder } from "../../stores/teamBuilderStore";
import { useMoveSummary } from "../../hooks/useMoveCatalog";
import { useModalBack } from "../../hooks/useModalBack";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { TypeBadge } from "../pokemon/TypeBadge";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { cn } from "../../lib/cn";

type ChartType = Exclude<PokemonType, "Stellar">;

const CHART_TYPES = ALL_TYPES.filter(
  (type): type is ChartType => type !== "Stellar",
);

const TYPE_COLORS: Record<string, string> = {
  Normal: "#9aa0a6",
  Fire: "#f97316",
  Water: "#3b82f6",
  Electric: "#facc15",
  Grass: "#22c55e",
  Ice: "#67e8f9",
  Fighting: "#b91c1c",
  Poison: "#9333ea",
  Ground: "#a16207",
  Flying: "#38bdf8",
  Psychic: "#ec4899",
  Bug: "#65a30d",
  Rock: "#78716c",
  Ghost: "#4338ca",
  Dragon: "#6d28d9",
  Dark: "#1e293b",
  Steel: "#64748b",
  Fairy: "#f9a8d4",
};

function multiplierLabel(value: number): string {
  if (value === 0) return "0×";
  if (value === 0.25) return "¼×";
  if (value === 0.5) return "½×";
  return `${value}×`;
}

function multiplierStyle(value: number): { background: string; color: string } {
  if (value === 0) return { background: "rgba(100,116,139,0.35)", color: "var(--text)" };
  if (value >= 4) return { background: "rgba(185,28,28,0.85)", color: "#fff" };
  if (value >= 2) return { background: "rgba(220,38,38,0.55)", color: "var(--text)" };
  if (value <= 0.25) return { background: "rgba(22,163,74,0.55)", color: "var(--text)" };
  if (value <= 0.5) return { background: "rgba(34,197,94,0.3)", color: "var(--text)" };
  return { background: "transparent", color: "var(--text-muted)" };
}

export function TypeLabModal() {
  const { t } = useTranslation();
  const open = useTypeLabStore((s) => s.open);
  const tab = useTypeLabStore((s) => s.tab);
  const setOpen = useTypeLabStore((s) => s.setOpen);
  const setTab = useTypeLabStore((s) => s.setTab);
  useModalBack(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("type_lab.title")}
      className="fixed inset-0 z-[72] flex items-center justify-center bg-black/65 p-2 sm:p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: "var(--bg-elev)", borderColor: "var(--border)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="relative flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 pr-12"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
            >
              <Grid3x3 size={16} />
            </span>
            <div>
              <h2 className="text-sm font-semibold">{t("type_lab.title")}</h2>
              <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {t("type_lab.hint")}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 rounded-md p-1.5"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
          {(
            [
              ["table", Grid3x3, "type_lab.tab_table"],
              ["natures", Dna, "type_lab.tab_natures"],
              ["coverage", Swords, "type_lab.tab_coverage"],
              ["team", ShieldCheck, "type_lab.tab_team"],
            ] as const
          ).map(([id, Icon, key]) => (
            <button
              key={id}
              type="button"
              className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium"
              style={{
                backgroundColor: tab === id ? "var(--accent-soft)" : "transparent",
                color: tab === id ? "var(--accent)" : "var(--text-muted)",
              }}
              onClick={() => setTab(id as TypeLabTab)}
            >
              <Icon size={12} />
              {t(key)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {tab === "table" && <TypeChartTable />}
          {tab === "natures" && <NatureTable />}
          {tab === "coverage" && <TypeCoverage />}
          {tab === "team" && <TeamCoverage />}
        </div>
      </div>
    </div>
  );
}

export function TypeChartTable({ landscape = false }: { landscape?: boolean }) {
  const { t } = useTranslation();
  const [attacker, setAttacker] = useState<ChartType | null>(null);
  const [defender, setDefender] = useState<ChartType | null>(null);
  const value =
    attacker && defender
      ? defensiveMultiplier([defender], attacker)
      : null;
  const selectCell = (nextAttacker: ChartType, nextDefender: ChartType) => {
    setAttacker(nextAttacker);
    setDefender(nextDefender);
  };
  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px]"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
        aria-live="polite"
      >
        <span style={{ color: "var(--text-muted)" }}>
          {attacker && defender && value !== null ? (
            <>
              <strong style={{ color: "var(--text)" }}>{typeLabel(t, attacker)}</strong>
              {" → "}
              <strong style={{ color: "var(--text)" }}>{typeLabel(t, defender)}</strong>
              {" = "}
              <span style={{ color: multiplierStyle(value).background, fontWeight: 700 }}>
                {multiplierLabel(value)}
              </span>
            </>
          ) : attacker ? (
            t("type_lab.pick_defender", { type: typeLabel(t, attacker) })
          ) : defender ? (
            t("type_lab.pick_attacker", { type: typeLabel(t, defender) })
          ) : (
            t("type_lab.pick_pair")
          )}
        </span>
        {(attacker || defender) && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px]"
            style={{ color: "var(--text-muted)" }}
            onClick={() => {
              setAttacker(null);
              setDefender(null);
            }}
          >
            <X size={11} />
            {t("type_lab.clear_selection")}
          </button>
        )}
      </div>
      <div className={cn("quick-table-scroll", landscape && "quick-table-scroll--landscape")}>
        <table className={cn("quick-table border-collapse", landscape && "quick-table--landscape")}>
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-20 border-b border-r px-2 py-1.5 text-left"
                style={{ backgroundColor: "var(--bg-elev-strong)", borderColor: "var(--border)" }}
              >
                {t("type_lab.attacker")}
              </th>
              {CHART_TYPES.map((type) => {
                const selected = defender === type;
                return (
                  <th
                    key={type}
                    className="sticky top-0 z-10 border-b p-0 text-center font-semibold"
                    style={{
                      backgroundColor: TYPE_COLORS[type],
                      borderColor: "var(--border)",
                      color: treemapTextColor(TYPE_COLORS[type]),
                    }}
                    title={typeLabel(t, type)}
                  >
                    <button
                      type="button"
                      className="h-full min-h-8 w-full px-1.5 py-1 text-[10px] font-semibold"
                      style={{
                        boxShadow: selected ? "inset 0 0 0 2px var(--accent)" : undefined,
                      }}
                      aria-pressed={selected}
                      onClick={() => setDefender(selected ? null : type)}
                    >
                      {typeLabel(t, type).slice(0, 3)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {CHART_TYPES.map((rowType) => {
              const rowSelected = attacker === rowType;
              return (
                <tr key={rowType}>
                  <th
                    className="sticky left-0 z-10 border-b border-r p-0 text-left text-[10px] font-semibold"
                    style={{
                      backgroundColor: TYPE_COLORS[rowType],
                      borderColor: "var(--border)",
                      color: treemapTextColor(TYPE_COLORS[rowType]),
                    }}
                    title={typeLabel(t, rowType)}
                  >
                    <button
                      type="button"
                      className="h-full w-full px-2 py-1 text-left"
                      style={{
                        boxShadow: rowSelected ? "inset 0 0 0 2px var(--accent)" : undefined,
                      }}
                      aria-pressed={rowSelected}
                      onClick={() => setAttacker(rowSelected ? null : rowType)}
                    >
                      {typeLabel(t, rowType)}
                    </button>
                  </th>
                  {CHART_TYPES.map((columnType) => {
                    const cellValue = defensiveMultiplier([columnType], rowType);
                    const style = multiplierStyle(cellValue);
                    const selected = rowSelected && defender === columnType;
                    return (
                      <td
                        key={columnType}
                        className="border-b p-0 text-center"
                        style={{ borderColor: "var(--border)", ...style }}
                      >
                        <button
                          type="button"
                          className="h-full min-h-8 w-full px-1 py-1 font-mono text-[10px] tabular-nums"
                          style={{
                            boxShadow: selected ? "inset 0 0 0 2px var(--accent)" : undefined,
                            color: "inherit",
                          }}
                          aria-pressed={selected}
                          aria-label={`${typeLabel(t, rowType)} → ${typeLabel(t, columnType)}: ${multiplierLabel(cellValue)}`}
                          title={`${typeLabel(t, rowType)} → ${typeLabel(t, columnType)}: ${multiplierLabel(cellValue)}`}
                          onClick={() => selectCell(rowType, columnType)}
                        >
                          {cellValue === 1 ? "·" : multiplierLabel(cellValue)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
        <span>0× {t("type_lab.immune")}</span>
        <span>½× {t("type_lab.resists")}</span>
        <span>2× {t("type_lab.weak")}</span>
        <span>4× {t("type_lab.double_weak")}</span>
      </div>
    </div>
  );
}

export function NatureTable({ landscape = false }: { landscape?: boolean }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NatureStat | "all">("all");
  const [selected, setSelected] = useState<NatureEffect | null>(null);
  const needle = query.trim().toLowerCase();
  const visible = NATURE_EFFECTS.filter((entry) => {
    if (needle && !natureLabel(t, entry.nature).toLowerCase().includes(needle)) {
      return false;
    }
    if (filter === "all") return true;
    return entry.up === filter || entry.down === filter;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-[11px]" style={{ color: "var(--text-muted)" }}>
          {t("type_lab.nature_hint")}
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-[10rem] flex-1 sm:w-56">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-dim)" }}
            />
            <input
              className="input h-8 w-full pl-8 text-xs"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("type_lab.nature_search")}
              aria-label={t("type_lab.nature_search")}
            />
          </div>
          <select
            className="input h-8 w-36 text-xs"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as NatureStat | "all")
            }
            aria-label={t("type_lab.nature_filter")}
          >
            <option value="all">{t("type_lab.nature_filter_all")}</option>
            {NATURE_BOOSTS.map((stat) => (
              <option key={stat} value={stat}>
                {statLabel(t, stat as StatKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="rounded-lg border px-2.5 py-2 text-[11px]"
        style={{
          borderColor: selected ? "var(--accent)" : "var(--border)",
          backgroundColor: "var(--bg)",
          color: "var(--text-muted)",
        }}
        aria-live="polite"
      >
        {selected ? (
          <span>
            <strong style={{ color: "var(--text)" }}>
              {natureLabel(t, selected.nature)}
            </strong>
            {": "}
            {selected.up ? (
              <>
                <span style={{ color: "var(--success)" }}>
                  +10% {statLabel(t, selected.up as StatKey)}
                </span>
                {" / "}
                <span style={{ color: "var(--danger)" }}>
                  −10% {statLabel(t, selected.down as StatKey)}
                </span>
              </>
            ) : (
              <span>{t("type_lab.nature_neutral")}</span>
            )}
          </span>
        ) : (
          t("type_lab.nature_pick")
        )}
      </div>

      <div className={cn("quick-table-scroll", landscape && "quick-table-scroll--landscape")}>
        <table className={cn("quick-table border-collapse text-[11px]", landscape && "quick-table--landscape")}>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-elev-strong)" }}>
              <th
                className="sticky left-0 top-0 z-20 border-b border-r px-2.5 py-2 text-left font-semibold"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elev-strong)" }}
              >
                {t("type_lab.nature_name")}
              </th>
              {NATURE_BOOSTS.map((stat) => (
                <th
                  key={stat}
                  className="sticky top-0 z-10 border-b px-2 py-2 text-center font-semibold"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-elev-strong)" }}
                >
                  {statLabel(t, stat as StatKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => {
              const isSelected = selected?.nature === entry.nature;
              return (
                <tr key={entry.nature}>
                  <th
                    className="sticky left-0 z-10 border-b border-r px-2.5 py-1.5 text-left font-medium"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: isSelected ? "var(--accent-soft)" : "var(--bg-elev)",
                      color: isSelected ? "var(--accent)" : "var(--text)",
                    }}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelected(entry)}
                    >
                      {natureLabel(t, entry.nature)}
                    </button>
                  </th>
                  {NATURE_BOOSTS.map((stat) => {
                    const up = entry.up === stat;
                    const down = entry.down === stat;
                    return (
                      <td
                        key={stat}
                        className="border-b p-0 text-center"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <button
                          type="button"
                          className="h-full min-h-8 w-full px-1.5 py-1 font-mono text-[10px] font-semibold"
                          style={{
                            backgroundColor: up
                              ? "color-mix(in srgb, var(--success) 20%, transparent)"
                              : down
                                ? "color-mix(in srgb, var(--danger) 20%, transparent)"
                                : "transparent",
                            color: up
                              ? "var(--success)"
                              : down
                                ? "var(--danger)"
                                : "var(--text-dim)",
                            boxShadow: isSelected ? "inset 0 0 0 2px var(--accent)" : undefined,
                          }}
                          aria-label={`${natureLabel(t, entry.nature)} · ${statLabel(t, stat as StatKey)}: ${
                            up ? "+10%" : down ? "−10%" : "0%"
                          }`}
                          onClick={() => setSelected(entry)}
                        >
                          {up ? "+10%" : down ? "−10%" : "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
        {t("type_lab.nature_hp_note")}
      </p>
      {visible.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("type_lab.nature_no_results")}
        </p>
      )}
    </div>
  );
}

function TypeCoverage() {
  const { t } = useTranslation();
  const [types, setTypes] = useState<PokemonType[]>([]);
  const matches = useMemo(
    () =>
      CHART_TYPES.map((attacking) => ({
        attacking,
        mult: Math.max(...types.map((defender) => defensiveMultiplier([defender], attacking))),
      })),
    [types],
  );
  const groups = [
    [4, "4×"],
    [2, "2×"],
    [1, "1×"],
    [0.5, "½×"],
    [0.25, "¼×"],
    [0, "0×"],
  ] as const;
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold">{t("type_lab.pick_defenders")}</p>
        <div className="flex flex-wrap gap-1">
          {CHART_TYPES.map((type) => {
            const active = types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setTypes((current) =>
                    current.includes(type)
                      ? current.filter((entry) => entry !== type)
                      : current.length >= 2
                        ? [current[1], type]
                        : [...current, type],
                  )
                }
                className={cn(
                  "rounded-full border px-2 py-1 text-[10px] font-medium",
                  active ? "ring-2 ring-[var(--accent)]" : "opacity-75",
                )}
                style={{ borderColor: TYPE_COLORS[type], color: "var(--text)" }}
              >
                {typeLabel(t, type)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(([value, label]) => {
          const entries = matches.filter((entry) => entry.mult === value);
          if (entries.length === 0) return null;
          return (
            <div
              key={label}
              className="rounded-lg border p-2"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-xs font-bold">{label}</span>
                <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                  {entries.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {entries.map((entry) => (
                  <TypeBadge key={entry.attacking} type={entry.attacking} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamCoverage() {
  const { t } = useTranslation();
  const team = useTeamBuilder((s) => s.team);
  const { data: pokedex = [] } = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
    staleTime: 60 * 60 * 1000,
  });
  const moveSummary = useMoveSummary();
  const byId = useMemo(() => {
    const map = new Map<string, (typeof pokedex)[number]>();
    pokedex.forEach((pokemon) => map.set(canonicalSpeciesId(pokemon.name), pokemon));
    return map;
  }, [pokedex]);
  const members = team.members
    .map((member) => ({
      member,
      pokemon: byId.get(canonicalSpeciesId(member.species)) ?? null,
    }))
    .filter((entry) => entry.pokemon);

  const defensive = useMemo(
    () =>
      CHART_TYPES.map((attacking) => {
        let four = 0;
        let two = 0;
        let half = 0;
        let zero = 0;
        for (const { pokemon } of members) {
          const mult = defensiveMultiplier(pokemon!.types, attacking);
          if (mult >= 4) four += 1;
          else if (mult >= 2) two += 1;
          else if (mult === 0) zero += 1;
          else if (mult <= 0.5) half += 1;
        }
        return { attacking, four, two, half, zero };
      }),
    [members],
  );

  const offensive = useMemo(() => {
    const moveTypes = new Set<PokemonType>();
    for (const { member, pokemon } of members) {
      for (const move of member.moves) {
        const summary = moveSummary(move);
        if (summary) moveTypes.add(summary.type_);
      }
      if (moveTypes.size === 0) {
        pokemon!.types.forEach((type) => moveTypes.add(type));
      }
    }
    return CHART_TYPES.map((defender) => ({
      defender,
      best: Math.max(0, ...[...moveTypes].map((attacking) => defensiveMultiplier([defender], attacking))),
    }));
  }, [members, moveSummary]);

  if (members.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
        {t("type_lab.team_empty")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold">
          <Shield size={12} /> {t("type_lab.team_defense")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {defensive
            .filter((entry) => entry.four + entry.two + entry.half + entry.zero > 0)
            .sort((a, b) => b.four * 10 + b.two - (a.four * 10 + a.two))
            .map((entry) => (
              <div
                key={entry.attacking}
                className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
              >
                <TypeBadge type={entry.attacking} />
                <span className="flex gap-1.5 text-[10px] font-mono">
                  {entry.four > 0 && <span style={{ color: "#f87171" }}>4×{entry.four}</span>}
                  {entry.two > 0 && <span style={{ color: "#fca5a5" }}>2×{entry.two}</span>}
                  {entry.half > 0 && <span style={{ color: "#86efac" }}>½×{entry.half}</span>}
                  {entry.zero > 0 && <span style={{ color: "var(--text-dim)" }}>0×{entry.zero}</span>}
                </span>
              </div>
            ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold">
          <Swords size={12} /> {t("type_lab.team_offense")}
        </h3>
        <div className="flex flex-wrap gap-1">
          {offensive.map((entry) => (
            <span
              key={entry.defender}
              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]"
              style={{
                borderColor: entry.best >= 2 ? "#f87171" : "var(--border)",
                color: entry.best >= 2 ? "#f87171" : "var(--text-dim)",
              }}
            >
              <TypeBadge type={entry.defender} />
              <span className="font-mono">{multiplierLabel(entry.best)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
