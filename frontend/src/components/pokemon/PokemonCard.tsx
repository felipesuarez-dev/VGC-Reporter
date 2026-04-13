import { Link } from "react-router-dom";
import type { Pokemon } from "../../lib/types";
import { PokemonSprite } from "./PokemonSprite";
import { TypeBadge } from "./TypeBadge";

export function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <Link
      to={`/pokedex/${pokemon.id}`}
      className="card flex flex-col items-center gap-2 transition-colors hover:border-brand-500"
    >
      <PokemonSprite url={pokemon.sprite_url} name={pokemon.name} size={80} />
      <div className="text-sm font-semibold text-slate-100">{pokemon.name}</div>
      <div className="flex flex-wrap justify-center gap-1">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
      <div className="text-[11px] text-slate-500">BST: {Object.values(pokemon.base_stats).reduce((a, b) => a + b, 0)}</div>
    </Link>
  );
}
