import { useTranslation } from "react-i18next";
import type { Pokemon } from "../../lib/types";
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
  return (
    <button
      type="button"
      onClick={() => openDetail(pokemon.id)}
      className="card relative flex flex-col items-center gap-2 text-left transition-colors hover:border-brand-500"
    >
      <span
        className="absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: "rgba(0,0,0,0.55)",
          color: usagePct > 0 ? "var(--accent)" : "var(--text-dim)",
        }}
      >
        {usagePct.toFixed(1)}%
      </span>
      <PokemonSprite
        url={pokemon.sprite_url}
        fallbackUrl={pokemon.sprite_fallback_url}
        name={pokemon.name}
        size={80}
      />
      <div
        className="text-sm font-semibold"
        style={{ color: "var(--text)" }}
      >
        {pokemon.name}
      </div>
      <div className="flex flex-nowrap justify-center gap-0.5">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
      <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
        {t("pokedex.base_stat_total")}: {Object.values(pokemon.base_stats).reduce((a, b) => a + b, 0)}
      </div>
    </button>
  );
}
