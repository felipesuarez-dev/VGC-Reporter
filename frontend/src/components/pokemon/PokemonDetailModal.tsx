import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import {
  type Pokemon,
  type PokemonType,
} from "../../lib/types";
import {
  offensiveCoverage,
  resistancesOf,
  weaknessesOf,
} from "../../lib/typeChart";
import { useDashboardStore } from "../../stores/dashboardStore";
import { usePokedexStore } from "../../stores/pokedexStore";
import { PokemonSprite } from "./PokemonSprite";
import { TypeBadge } from "./TypeBadge";
import { PokemonSetCard } from "./PokemonSetCard";
import { EntityChip } from "../info/EntityChip";
import { useLocalize, type LocalizeKind } from "../../hooks/useTranslations";
import { prettifyName, statLabel, type StatKey } from "../../lib/labels";

type Tab = "doubles" | "singles";

export function PokemonDetailModal() {
  const { t } = useTranslation();
  const id = usePokedexStore((s) => s.selectedPokemonId);
  const close = usePokedexStore((s) => s.closeDetail);
  const format = useDashboardStore((s) => s.format);
  const [tab, setTab] = useState<Tab>(() =>
    format === "champions-singles" || format === "gen9-ou" ? "singles" : "doubles",
  );

  useEffect(() => {
    if (!id) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [id, close]);

  const pokemon = useQuery({
    queryKey: queryKeys.pokedex.detail(id ?? ""),
    queryFn: () => ipc.getPokemon(id!),
    enabled: Boolean(id),
  });

  const sets = useQuery({
    queryKey: queryKeys.sets(pokemon.data?.name ?? ""),
    queryFn: () => ipc.getPokemonSets(pokemon.data!.name),
    enabled: Boolean(pokemon.data),
    staleTime: 60 * 60 * 1000,
  });

  const meta = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
  });

  if (!id) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={close}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border p-5 shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
          onClick={close}
          aria-label={t("pokemon_detail.close")}
        >
          <X size={18} />
        </button>

        {pokemon.isLoading && (
          <div style={{ color: "var(--text-muted)" }}>{t("common.loading")}</div>
        )}
        {pokemon.isError && (
          <div style={{ color: "var(--danger)" }}>{t("common.error")}</div>
        )}
        {pokemon.data && (
          <ModalBody
            pokemon={pokemon.data}
            tab={tab}
            setTab={setTab}
            sets={sets.data ?? null}
            setsLoading={sets.isLoading}
            metaUsage={meta.data?.pokemon ?? []}
            metaPokedex={meta.data}
          />
        )}
      </div>
    </div>
  );
}

interface BodyProps {
  pokemon: Pokemon;
  tab: Tab;
  setTab: (t: Tab) => void;
  sets: import("../../lib/types").SetsBundle | null;
  setsLoading: boolean;
  metaUsage: import("../../lib/types").PokemonUsage[];
  metaPokedex: import("../../lib/types").MetaSnapshot | undefined;
}

function ModalBody({
  pokemon,
  tab,
  setTab,
  sets,
  setsLoading,
  metaUsage,
}: BodyProps) {
  const { t } = useTranslation();
  const localize = useLocalize();
  const total = Object.values(pokemon.base_stats).reduce((a, b) => a + b, 0);

  const myUsage = useMemo(
    () => metaUsage.find((u) => u.species.toLowerCase() === pokemon.name.toLowerCase()),
    [metaUsage, pokemon.name],
  );

  const weaknesses = useMemo(() => weaknessesOf(pokemon.types), [pokemon.types]);
  const resistances = useMemo(() => resistancesOf(pokemon.types), [pokemon.types]);
  const coverage = useMemo(() => offensiveCoverage(pokemon.types), [pokemon.types]);

  const tabSets = tab === "doubles" ? sets?.doubles ?? [] : sets?.singles ?? [];
  const tabSource =
    tab === "doubles" ? sets?.doubles_source ?? null : sets?.singles_source ?? null;

  const naturesEntries = useMemo(() => {
    const usageNatures = myUsage?.top_natures ?? [];
    if (usageNatures.length > 0) return usageNatures;
    const allSets = [...(sets?.doubles ?? []), ...(sets?.singles ?? [])];
    const counts = new Map<string, number>();
    for (const s of allSets) {
      if (!s.nature) continue;
      counts.set(s.nature, (counts.get(s.nature) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        usage_percent: (count / total) * 100,
      }));
  }, [myUsage?.top_natures, sets?.doubles, sets?.singles]);

  return (
    <>
      <header className="mb-4 flex flex-col items-start gap-4 sm:flex-row">
        <PokemonSprite
          url={pokemon.sprite_url}
          fallbackUrl={pokemon.sprite_fallback_url}
          name={pokemon.name}
          size={120}
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {pokemon.name}
            <span
              className="ml-2 text-sm font-normal"
              style={{ color: "var(--text-dim)" }}
            >
              #{pokemon.num.toString().padStart(4, "0")}
            </span>
          </h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {pokemon.types.map((ty) => (
              <TypeBadge key={ty} type={ty} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
            {(Object.entries(pokemon.base_stats) as [string, number][]).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: "var(--text-dim)" }}>{statLabel(t, k as StatKey)}</span>
                <span style={{ color: "var(--text)" }}>{v}</span>
              </div>
            ))}
            <div
              className="col-span-3 text-right text-[11px]"
              style={{ color: "var(--text-dim)" }}
            >
              {t("pokedex.base_stat_total")}: {total}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {pokemon.abilities.map((a) => (
              <span
                key={a}
                className="rounded px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: "var(--bg-elev-strong)",
                  color: "var(--text)",
                }}
              >
                {localize("ability", a)}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div
        className="mb-3 flex overflow-hidden rounded-lg border text-xs"
        style={{ borderColor: "var(--border)" }}
      >
        {(["doubles", "singles"] as Tab[]).map((tg) => (
          <button
            key={tg}
            type="button"
            onClick={() => setTab(tg)}
            className="flex-1 px-3 py-1.5 font-medium"
            style={
              tab === tg
                ? { backgroundColor: "var(--accent)", color: "#ffffff" }
                : {
                    backgroundColor: "var(--bg-elev)",
                    color: "var(--text-muted)",
                  }
            }
          >
            {t(`pokemon_detail.${tg}`)}
          </button>
        ))}
      </div>

      <section className="mb-4 space-y-2">
        <h3
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          {t("pokemon_detail.curated_sets")}
        </h3>
        {setsLoading && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("common.loading")}
          </p>
        )}
        {!setsLoading && tabSets.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {t("pokemon_detail.no_sets")}
          </p>
        )}
        {tabSets.length > 0 && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {tabSets.map((s, i) => (
              <PokemonSetCard key={`${s.name}-${i}`} set={s} />
            ))}
          </div>
        )}
        {tabSource && (
          <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {t("pokemon_detail.source")}: {tabSource}
          </p>
        )}
      </section>

      {myUsage && (
        <section className="mb-4 space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            {t("pokemon_detail.meta_usage")}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <UsageList title={t("drawer.top_items")} entries={myUsage.top_items} kind="item" />
            <UsageList title={t("drawer.top_moves")} entries={myUsage.top_moves} kind="move" />
            <UsageList title={t("drawer.top_abilities")} entries={myUsage.top_abilities} kind="ability" />
            <UsageList title={t("drawer.top_tera")} entries={myUsage.top_tera} />
            <UsageList title={t("drawer.top_teammates")} entries={myUsage.top_teammates} />
            <NaturesList entries={naturesEntries} />
          </div>
          {myUsage.common_movesets && myUsage.common_movesets.length > 0 && (
            <div className="mt-2">
              <h4
                className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {t("drawer.top_movesets")}
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {myUsage.common_movesets.slice(0, 5).map((ms, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border p-2"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--bg-elev)",
                    }}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-[10px]">
                      <span style={{ color: "var(--text-dim)" }}>#{idx + 1}</span>
                      <span
                        className="tabular-nums"
                        style={{ color: "var(--accent)" }}
                      >
                        {ms.usage_percent.toFixed(1)}%
                      </span>
                    </div>
                    <ul className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
                      {ms.moves.map((mv) => (
                        <li key={mv}>
                          <EntityChip kind="move" name={mv} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h3
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          {t("pokemon_detail.matchups")}
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg-elev)",
            }}
          >
            <h4 className="mb-2 text-xs font-semibold text-rose-400">
              {t("pokemon_detail.weak_against")}
            </h4>
            {weaknesses.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>—</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {weaknesses.map((w) => (
                  <li key={w.type} className="flex items-center gap-1">
                    <TypeBadge type={w.type} />
                    <span className="text-[10px] text-rose-400">×{w.mult}</span>
                  </li>
                ))}
              </ul>
            )}
            <p
              className="mt-3 mb-1 text-[10px] uppercase tracking-wide"
              style={{ color: "var(--text-dim)" }}
            >
              {t("pokemon_detail.stab_resisted_by")}
            </p>
            <ul className="flex flex-wrap gap-1">
              {coverage.resists.map((tp: PokemonType) => (
                <li key={tp}>
                  <TypeBadge type={tp} />
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg-elev)",
            }}
          >
            <h4 className="mb-2 text-xs font-semibold text-emerald-400">
              {t("pokemon_detail.strong_against")}
            </h4>
            {resistances.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>—</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {resistances.map((r) => (
                  <li key={r.type} className="flex items-center gap-1">
                    <TypeBadge type={r.type} />
                    <span className="text-[10px] text-emerald-400">×{r.mult}</span>
                  </li>
                ))}
              </ul>
            )}
            <p
              className="mt-3 mb-1 text-[10px] uppercase tracking-wide"
              style={{ color: "var(--text-dim)" }}
            >
              {t("pokemon_detail.stab_super_effective_on")}
            </p>
            <ul className="flex flex-wrap gap-1">
              {coverage.weakTo.map((tp: PokemonType) => (
                <li key={tp}>
                  <TypeBadge type={tp} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function NaturesList({
  entries,
}: {
  entries: import("../../lib/types").UsageEntry[];
}) {
  const { t } = useTranslation();
  if (!entries || entries.length === 0) return null;
  return (
    <section
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-elev)",
      }}
    >
      <h4
        className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {t("drawer.top_natures")}
      </h4>
      <ul className="space-y-1">
        {entries.slice(0, 5).map((e) => (
          <li key={e.name} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate" style={{ color: "var(--text)" }}>
              {t(`natures.${e.name}`, { defaultValue: e.name })}
            </span>
            <span
              className="shrink-0 tabular-nums"
              style={{ color: "var(--accent)" }}
            >
              {e.usage_percent.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UsageList({
  title,
  entries,
  kind,
}: {
  title: string;
  entries: import("../../lib/types").UsageEntry[];
  kind?: LocalizeKind;
}) {
  const localize = useLocalize();
  return (
    <section
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-elev)",
      }}
    >
      <h4
        className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </h4>
      {entries.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>—</p>
      ) : (
        <ul className="space-y-1">
          {entries.slice(0, 5).map((e) => (
            <li key={e.name} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate" style={{ color: "var(--text)" }}>
                {kind ? localize(kind, e.name) : prettifyName(e.name)}
              </span>
              <span
                className="shrink-0 tabular-nums"
                style={{ color: "var(--accent)" }}
              >
                {e.usage_percent.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
