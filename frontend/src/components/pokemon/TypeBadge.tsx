import type { PokemonType } from "../../lib/types";
import { cn } from "../../lib/cn";

const COLORS: Record<PokemonType, string> = {
  Normal: "bg-slate-400 text-slate-900",
  Fire: "bg-orange-500 text-white",
  Water: "bg-blue-500 text-white",
  Electric: "bg-yellow-400 text-slate-900",
  Grass: "bg-green-500 text-white",
  Ice: "bg-cyan-300 text-slate-900",
  Fighting: "bg-red-700 text-white",
  Poison: "bg-purple-600 text-white",
  Ground: "bg-yellow-700 text-white",
  Flying: "bg-sky-400 text-white",
  Psychic: "bg-pink-500 text-white",
  Bug: "bg-lime-600 text-white",
  Rock: "bg-stone-500 text-white",
  Ghost: "bg-indigo-700 text-white",
  Dragon: "bg-violet-700 text-white",
  Dark: "bg-slate-800 text-white",
  Steel: "bg-slate-500 text-white",
  Fairy: "bg-pink-300 text-slate-900",
  Stellar: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
};

export function TypeBadge({ type, className }: { type: PokemonType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        COLORS[type],
        className,
      )}
    >
      {type}
    </span>
  );
}
