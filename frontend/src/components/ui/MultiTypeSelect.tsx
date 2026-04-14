import { useTranslation } from "react-i18next";
import { ALL_TYPES, type PokemonType } from "../../lib/types";
import { typeLabel } from "../../lib/labels";
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

interface Props {
  value: PokemonType[];
  onChange: (next: PokemonType[]) => void;
  excludeStellar?: boolean;
}

export function MultiTypeSelect({ value, onChange, excludeStellar = false }: Props) {
  const { t } = useTranslation();
  const selected = new Set(value);
  const types = excludeStellar
    ? ALL_TYPES.filter((ty) => ty !== "Stellar")
    : ALL_TYPES;

  const toggle = (ty: PokemonType) => {
    const next = new Set(selected);
    if (next.has(ty)) next.delete(ty);
    else next.add(ty);
    onChange(Array.from(next));
  };

  return (
    <div className="flex flex-wrap gap-1">
      {types.map((ty) => {
        const isSelected = selected.has(ty);
        return (
          <button
            key={ty}
            type="button"
            onClick={() => toggle(ty)}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition",
              COLORS[ty],
              isSelected
                ? "ring-2 ring-offset-1 ring-white ring-offset-[var(--bg-elev)]"
                : "opacity-60 hover:opacity-100",
            )}
          >
            {typeLabel(t, ty)}
          </button>
        );
      })}
    </div>
  );
}
