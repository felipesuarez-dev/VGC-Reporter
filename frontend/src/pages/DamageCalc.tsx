import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { calculate, Generations, Pokemon as CalcPokemon, Move as CalcMove } from "@smogon/calc";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";

const GEN = Generations.get(9);

export function DamageCalc() {
  const { t } = useTranslation();
  const { data: pokedex = [] } = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
  });

  const [attackerName, setAttackerName] = useState("Incineroar");
  const [defenderName, setDefenderName] = useState("Urshifu");
  const [moveName, setMoveName] = useState("Knock Off");
  const [level, setLevel] = useState(50);

  const result = useMemo(() => {
    try {
      const attacker = new CalcPokemon(GEN, attackerName, { level });
      const defender = new CalcPokemon(GEN, defenderName, { level });
      const move = new CalcMove(GEN, moveName);
      const r = calculate(GEN, attacker, defender, move);
      const dmg = r.damage;
      const arr = Array.isArray(dmg) ? (dmg as number[]) : [dmg as number];
      const min = arr[0] ?? 0;
      const max = arr[arr.length - 1] ?? 0;
      const desc = typeof r.desc === "function" ? r.desc() : String(r.desc ?? "");
      return { min, max, desc };
    } catch (e) {
      return { min: 0, max: 0, desc: (e as Error).message };
    }
  }, [attackerName, defenderName, moveName, level]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("damage_calc.title")}</h1>
      </header>

      <div className="card grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="label">{t("damage_calc.attacker")}</label>
          <input
            list="dc-pkm"
            className="input mt-1"
            value={attackerName}
            onChange={(e) => setAttackerName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("damage_calc.defender")}</label>
          <input
            list="dc-pkm"
            className="input mt-1"
            value={defenderName}
            onChange={(e) => setDefenderName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("damage_calc.move")}</label>
          <input
            className="input mt-1"
            value={moveName}
            onChange={(e) => setMoveName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("damage_calc.level")}</label>
          <input
            type="number"
            min={1}
            max={100}
            className="input mt-1"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) || 50)}
          />
        </div>
        <datalist id="dc-pkm">
          {pokedex.slice(0, 500).map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
      </div>

      <div className="card space-y-2">
        <div className="label">{t("damage_calc.result")}</div>
        <div className="text-lg font-semibold text-brand-300">
          {t("damage_calc.min")}: {result.min} · {t("damage_calc.max")}: {result.max}
        </div>
        <pre className="whitespace-pre-wrap text-xs text-slate-400">{result.desc}</pre>
      </div>
    </div>
  );
}
