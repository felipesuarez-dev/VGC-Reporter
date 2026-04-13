import type { PokemonSet } from "../../lib/types";

const STAT_KEYS: (keyof PokemonSet["evs"])[] = ["hp", "atk", "def", "spa", "spd", "spe"];
const STAT_LABELS: Record<keyof PokemonSet["evs"], string> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
};

export function PokemonSetCard({ set }: { set: PokemonSet }) {
  const evs = STAT_KEYS.filter((k) => set.evs[k] > 0);
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-100">{set.name}</h4>
        {set.tera_types.length > 0 && (
          <span className="text-[10px] uppercase tracking-wide text-brand-300">
            Tera: {set.tera_types.join(" / ")}
          </span>
        )}
      </header>

      <dl className="mb-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-300">
        {set.item && (
          <>
            <dt className="text-slate-500">Item</dt>
            <dd>{set.item}</dd>
          </>
        )}
        {set.ability && (
          <>
            <dt className="text-slate-500">Ability</dt>
            <dd>{set.ability}</dd>
          </>
        )}
        {set.nature && (
          <>
            <dt className="text-slate-500">Nature</dt>
            <dd>{set.nature}</dd>
          </>
        )}
      </dl>

      {evs.length > 0 && (
        <div className="mb-2 text-[11px] text-slate-400">
          EVs:{" "}
          <span className="text-slate-200">
            {evs.map((k) => `${set.evs[k]} ${STAT_LABELS[k]}`).join(" / ")}
          </span>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-1">
        {set.moves.map((m, i) => (
          <li
            key={`${m}-${i}`}
            className="rounded bg-slate-800/70 px-2 py-0.5 text-xs text-slate-200"
          >
            {m}
          </li>
        ))}
      </ul>
    </article>
  );
}
