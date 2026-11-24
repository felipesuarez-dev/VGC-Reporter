import { useTranslation } from "react-i18next";
import type { Pokemon } from "../../lib/types";
import { generationOf } from "../../lib/types";
import { usePokedexStore } from "../../stores/pokedexStore";
import { PokemonSprite } from "./PokemonSprite";
import { TypeBadge } from "./TypeBadge";

interface Props {
  pokemon: Pokemon;
  usage?: number;
}

export function PokemonCard({ pokemon, usage }: Props) {
  const { t } = useTranslation();
  const openDetail = usePokedexStore((s) => s.openDetail);
  const usagePct = typeof usage === "number" ? usage : 0;
  const bst = Object.values(pokemon.base_stats).reduce((a, b) => a + b, 0);
  return (
    <button
      type="button"
      onClick={() => openDetail(pokemon.id)}
      className="group relative flex flex-col items-center gap-2 rounded-xl border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-elev) 88%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <span
        className="absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
        style={{
          backgroundColor: "var(--bg-elev-strong)",
          color: "var(--text-dim)",
        }}
        title={t("pokedex.generation_label", { n: generationOf(pokemon.num) })}
      >
        G{generationOf(pokemon.num)}
      </span>
      <span
        className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
        style={{
          backgroundColor:
            usagePct > 0 ? "var(--accent-soft)" : "var(--bg-elev-strong)",
          color: usagePct > 0 ? "var(--accent)" : "var(--text-dim)",
        }}
        title={`${t("common.usage")}: ${usagePct.toFixed(1)}%`}
      >
        {usagePct.toFixed(1)}%
      </span>
      <div className="mt-4">
        <PokemonSprite
          url={pokemon.sprite_url}
          fallbackUrl={pokemon.sprite_fallback_url}
          homeUrl={pokemon.home_sprite_url}
          name={pokemon.name}
          size={82}
        />
      </div>
      <div
        className="max-w-full truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent)]"
        style={{ color: "var(--text)" }}
        title={pokemon.name}
      >
        {pokemon.name}
      </div>
      <div className="flex flex-nowrap justify-center gap-0.5">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>
      <div className="flex w-full items-center justify-between gap-2 border-t pt-2 text-[10px]" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
        <span>
          {t("pokedex.base_stat_total")}: <strong style={{ color: "var(--text)" }}>{bst}</strong>
        </span>
        <span className="h-1.5 w-14 overflow-hidden rounded-full" style={{ backgroundColor: "var(--bg-elev-strong)" }}>
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.min(100, usagePct)}%`,
              backgroundColor: "var(--accent)",
            }}
          />
        </span>
      </div>
    </button>
  );
}
