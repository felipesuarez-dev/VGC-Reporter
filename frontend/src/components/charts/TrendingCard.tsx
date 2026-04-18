import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TrendingDown, TrendingUp } from "lucide-react";
import { ipc } from "../../lib/ipc";
import { queryKeys } from "../../lib/queryKeys";
import { type TrendingPokemon } from "../../lib/types";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { usePokedexStore } from "../../stores/pokedexStore";

function canonicalSpeciesId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function TrendingCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.trending(),
    queryFn: () => ipc.getTrending(),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="card">
        <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("dashboard.trending_title")}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("common.loading")}
        </p>
      </section>
    );
  }

  if (!data || (data.rising.length === 0 && data.falling.length === 0)) {
    return (
      <section className="card">
        <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("dashboard.trending_title")}
        </h2>
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {t("dashboard.trending_empty")}
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
        {t("dashboard.trending_title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrendingColumn
          title={t("dashboard.trending_rising")}
          direction="up"
          entries={data.rising}
        />
        <TrendingColumn
          title={t("dashboard.trending_falling")}
          direction="down"
          entries={data.falling}
        />
      </div>
    </section>
  );
}

function TrendingColumn({
  title,
  direction,
  entries,
}: {
  title: string;
  direction: "up" | "down";
  entries: TrendingPokemon[];
}) {
  const openDetail = usePokedexStore((s) => s.openDetail);
  const rows = entries.slice(0, 8);
  const Icon = direction === "up" ? TrendingUp : TrendingDown;
  const accentColor = direction === "up" ? "#34d399" : "#f87171";

  if (rows.length === 0) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: accentColor }}>
          <Icon size={14} />
          <span>{title}</span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          —
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: accentColor }}
      >
        <Icon size={14} />
        <span>{title}</span>
      </div>
      <ul className="space-y-1">
        {rows.map((e) => (
          <li key={e.species}>
            <button
              type="button"
              onClick={() => openDetail(canonicalSpeciesId(e.species))}
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition hover:bg-[var(--bg-elev-strong)]"
            >
              <PokemonSprite
                url={e.sprite_url}
                fallbackUrl={e.sprite_fallback_url ?? undefined}
                name={e.species}
                size={28}
                variant="pixel"
              />
              <span
                className="flex-1 truncate text-xs"
                style={{ color: "var(--text)" }}
              >
                {e.species}
              </span>
              <span
                className="shrink-0 text-[11px] font-semibold tabular-nums"
                style={{ color: accentColor }}
              >
                {direction === "up" ? "▲" : "▼"} {Math.abs(e.change_percentage).toFixed(1)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
