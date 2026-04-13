import type { EvSpread } from "../../lib/types";

const STAT_KEYS: (keyof EvSpread)[] = ["hp", "atk", "def", "spa", "spd", "spe"];
const STAT_LABEL: Record<keyof EvSpread, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

interface Props {
  value: EvSpread;
  onChange: (next: EvSpread) => void;
}

export function EVSliders({ value, onChange }: Props) {
  const total = STAT_KEYS.reduce((a, k) => a + value[k], 0);
  const over = total > 508;

  return (
    <div className="space-y-1">
      {STAT_KEYS.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-10 text-[10px] font-semibold uppercase text-slate-400">{STAT_LABEL[k]}</span>
          <input
            type="range"
            min={0}
            max={252}
            step={4}
            value={value[k]}
            onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) })}
            className="flex-1 accent-brand-500"
          />
          <input
            type="number"
            min={0}
            max={252}
            step={4}
            value={value[k]}
            onChange={(e) => onChange({ ...value, [k]: Number(e.target.value) })}
            className="w-14 rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-right text-xs"
          />
        </div>
      ))}
      <div className={`text-right text-[10px] ${over ? "text-red-400" : "text-slate-500"}`}>
        {total} / 508
      </div>
    </div>
  );
}
