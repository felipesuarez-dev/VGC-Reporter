import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Calculator, X } from "lucide-react";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import {
  canonicalSpeciesId,
  type Pokemon,
  type PokemonType,
  type TopTeamsReport,
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
import { MovesetTierCard } from "./MovesetTierCard";
import { PikalyticsSection } from "./PikalyticsSection";
import { useLocalize, type LocalizeKind } from "../../hooks/useTranslations";
import { prettifyName, statLabel, type StatKey } from "../../lib/labels";
import { EntityChip } from "../info/EntityChip";
import { type TeammateUsage } from "../../lib/types";

export function PokemonDetailModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const id = usePokedexStore((s) => s.selectedPokemonId);
  const close = usePokedexStore((s) => s.closeDetail);
  const format = useDashboardStore((s) => s.format);
  const [calcMenuOpen, setCalcMenuOpen] = useState(false);

  useEffect(() => {
    if (!id) setCalcMenuOpen(false);
  }, [id]);

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

  const sendToCalc = (role: "attacker" | "defender") => {
    if (!pokemon.data) return;
    setCalcMenuOpen(false);
    close();
    navigate("/damage-calc", { state: { species: pokemon.data, role } });
  };

  const meta = useQuery({
    queryKey: queryKeys.meta(format),
    queryFn: () => ipc.getMetaStats(format),
  });

  const topTeams = useQuery({
    queryKey: queryKeys.topTeams(format, 100),
    queryFn: () => ipc.getTopTeams(format, 100),
    staleTime: 30 * 60 * 1000,
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
        <div className="absolute right-3 top-3 flex items-center gap-1">
          {pokemon.data && (
            <div className="relative">
              <button
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
                onClick={() => setCalcMenuOpen((o) => !o)}
                aria-label={t("pokemon_detail.send_to_calc")}
                title={t("pokemon_detail.send_to_calc")}
              >
                <Calculator size={18} />
              </button>
              {calcMenuOpen && (
                <div
                  className="absolute right-0 top-full z-10 mt-1 flex flex-col rounded-md border shadow-lg"
                  style={{
                    backgroundColor: "var(--bg-elev-strong)",
                    borderColor: "var(--border)",
                  }}
                  onMouseLeave={() => setCalcMenuOpen(false)}
                >
                  <button
                    type="button"
                    className="whitespace-nowrap px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-elev)]"
                    style={{ color: "var(--text)" }}
                    onClick={() => sendToCalc("attacker")}
                  >
                    {t("damage_calc.attacker")}
                  </button>
                  <button
                    type="button"
                    className="whitespace-nowrap px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-elev)]"
                    style={{ color: "var(--text)" }}
                    onClick={() => sendToCalc("defender")}
                  >
                    {t("damage_calc.defender")}
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elev-strong)] hover:text-[var(--text)]"
            onClick={close}
            aria-label={t("pokemon_detail.close")}
          >
            <X size={18} />
          </button>
        </div>

        {pokemon.isLoading && (
          <div style={{ color: "var(--text-muted)" }}>{t("common.loading")}</div>
        )}
        {pokemon.isError && (
          <div
            className="flex flex-col items-start gap-2 text-xs"
            style={{ color: "var(--danger)" }}
          >
            <span>
              {t("common.error_with_detail", {
                detail: (pokemon.error as { message?: string })?.message ?? "",
              })}
            </span>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => pokemon.refetch()}
            >
              {t("common.retry")}
            </button>
          </div>
        )}
        {pokemon.data && (
          <ModalBody
            pokemon={pokemon.data}
            metaUsage={meta.data?.pokemon ?? []}
            metaPokedex={meta.data}
            topTeams={topTeams.data ?? null}
          />
        )}
      </div>
    </div>
  );
}

interface BodyProps {
  pokemon: Pokemon;
  metaUsage: import("../../lib/types").PokemonUsage[];
  metaPokedex: import("../../lib/types").MetaSnapshot | undefined;
  topTeams: TopTeamsReport | null;
}

function ModalBody({
  pokemon,
  metaUsage,
  topTeams,
}: BodyProps) {
  const { t } = useTranslation();
  const localize = useLocalize();
  const total = Object.values(pokemon.base_stats).reduce((a, b) => a + b, 0);

  const myUsage = useMemo(() => {
    const target = canonicalSpeciesId(pokemon.name);
    return metaUsage.find((u) => canonicalSpeciesId(u.species) === target);
  }, [metaUsage, pokemon.name]);

  const weaknesses = useMemo(() => weaknessesOf(pokemon.types), [pokemon.types]);
  const resistances = useMemo(() => resistancesOf(pokemon.types), [pokemon.types]);
  const coverage = useMemo(() => offensiveCoverage(pokemon.types), [pokemon.types]);

  const naturesEntries = useMemo(() => {
    const usageNatures = myUsage?.top_natures ?? [];
    if (usageNatures.length > 0) return usageNatures;
    const counts = new Map<string, number>();
    if (topTeams?.teams) {
      const target = canonicalSpeciesId(pokemon.name);
      for (const team of topTeams.teams) {
        for (const m of team.members) {
          if (canonicalSpeciesId(m.species) !== target) continue;
          if (m.nature) counts.set(m.nature, (counts.get(m.nature) ?? 0) + 1);
        }
      }
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
  }, [myUsage?.top_natures, topTeams?.teams, pokemon.name]);

  return (
    <>
      <header className="mb-4 flex flex-col items-start gap-4 sm:flex-row">
        <PokemonSprite
          url={pokemon.sprite_url}
          fallbackUrl={pokemon.sprite_fallback_url}
          homeUrl={pokemon.home_sprite_url}
          variant="hd"
          name={pokemon.name}
          size={120}
        />
        <div className="flex-1">
          <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold" style={{ color: "var(--text)" }}>
            <span>{pokemon.name}</span>
            <span
              className="text-sm font-normal"
              style={{ color: "var(--text-dim)" }}
            >
              #{pokemon.num.toString().padStart(4, "0")}
            </span>
            {myUsage && (
              <span
                className="rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums"
                style={{
                  borderColor: "var(--accent)",
                  color: "var(--accent)",
                  backgroundColor: "var(--accent-soft)",
                }}
                title={t("dashboard.top_pokemon")}
              >
                {myUsage.usage_percent.toFixed(1)}%
              </span>
            )}
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

      {(myUsage || naturesEntries.length > 0) && (
        <section className="mb-4 space-y-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            {t("pokemon_detail.meta_usage")}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {myUsage && (
              <>
                <UsageList title={t("drawer.top_items")} entries={myUsage.top_items} kind="item" />
                <UsageList title={t("drawer.top_moves")} entries={myUsage.top_moves} kind="move" />
                <TeammatesList title={t("drawer.top_teammates")} entries={myUsage.top_teammates} />
                <UsageList title={t("drawer.top_abilities")} entries={myUsage.top_abilities} kind="ability" />
              </>
            )}
            <NaturesList entries={naturesEntries} />
          </div>
          {myUsage && myUsage.common_movesets && myUsage.common_movesets.length > 0 && (
            <div className="mt-2">
              <h4
                className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {t("drawer.top_movesets")}
              </h4>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {myUsage.common_movesets.slice(0, 5).map((ms, idx) => (
                  <MovesetTierCard key={idx} moveset={ms} rank={idx} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <PikalyticsSection species={pokemon.name} />

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
              {kind ? (
                <EntityChip kind={kind} name={e.name} className="truncate" />
              ) : (
                <span className="truncate" style={{ color: "var(--text)" }}>
                  {prettifyName(e.name)}
                </span>
              )}
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

function TeammatesList({
  title,
  entries,
}: {
  title: string;
  entries: TeammateUsage[];
}) {
  const openDetail = usePokedexStore((s) => s.openDetail);
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
            <li key={e.name} className="text-xs">
              <button
                type="button"
                onClick={() => openDetail(canonicalSpeciesId(e.name))}
                className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition hover:bg-[var(--bg-elev-strong)]"
              >
                <PokemonSprite
                  url={e.sprite_url}
                  fallbackUrl={e.sprite_fallback_url ?? undefined}
                  homeUrl={e.home_sprite_url ?? undefined}
                  name={e.name}
                  size={22}
                  variant="pixel"
                />
                <span className="flex-1 truncate" style={{ color: "var(--text)" }}>
                  {e.name}
                </span>
                <span
                  className="shrink-0 tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {e.usage_percent.toFixed(1)}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
