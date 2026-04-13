import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { PokemonSprite } from "../components/pokemon/PokemonSprite";
import { TypeBadge } from "../components/pokemon/TypeBadge";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

export function PokemonDetail() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.pokedex.detail(id),
    queryFn: () => ipc.getPokemon(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="card text-slate-400">{t("common.loading")}</div>;
  if (isError || !data)
    return <div className="card text-red-400">{t("common.error")}</div>;

  const total = Object.values(data.base_stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <Link to="/pokedex" className="btn-ghost w-max">
        <ArrowLeft size={14} className="mr-1" />
        {t("nav.pokedex")}
      </Link>

      <div className="card flex flex-col items-center gap-3 md:flex-row md:items-start">
        <PokemonSprite url={data.sprite_url} name={data.name} size={128} />
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <div className="mt-1 flex flex-wrap gap-1">
              {data.types.map((ty) => (
                <TypeBadge key={ty} type={ty} />
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-1">Base stats</div>
            <div className="space-y-1">
              {(Object.entries(data.base_stats) as [keyof typeof data.base_stats, number][]).map(
                ([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-10 text-[11px] font-semibold text-slate-400">
                      {STAT_LABELS[k]}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${Math.min(100, (v / 200) * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-slate-300">{v}</span>
                  </div>
                ),
              )}
            </div>
            <div className="mt-2 text-right text-xs text-slate-500">BST: {total}</div>
          </div>

          <div>
            <div className="label mb-1">Abilities</div>
            <div className="flex flex-wrap gap-1 text-sm text-slate-200">
              {data.abilities.map((a) => (
                <span key={a} className="rounded bg-slate-800 px-2 py-0.5 text-xs">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
