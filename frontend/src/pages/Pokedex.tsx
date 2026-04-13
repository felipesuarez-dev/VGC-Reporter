import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import { ALL_TYPES, type PokemonType } from "../lib/types";
import { PokemonCard } from "../components/pokemon/PokemonCard";

export function Pokedex() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PokemonType | "">("");

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.pokedex.search(query, type || undefined),
    queryFn: () =>
      ipc.searchPokemon(query || undefined, (type || undefined) as PokemonType | undefined),
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("pokedex.title")}</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          className="input max-w-xs"
          placeholder={t("pokedex.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input max-w-[10rem]"
          value={type}
          onChange={(e) => setType(e.target.value as PokemonType | "")}
        >
          <option value="">{t("common.all_types")}</option>
          {ALL_TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <div className="card text-slate-400">{t("common.loading")}</div>}
      {isError && <div className="card text-red-400">{t("common.error")}</div>}
      {data && data.length === 0 && (
        <div className="card text-slate-400">{t("common.empty")}</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {data?.map((p) => (
          <PokemonCard key={p.id} pokemon={p} />
        ))}
      </div>
    </div>
  );
}
