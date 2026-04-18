import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import type { Pokemon } from "../../lib/types";
import { PokemonSprite } from "../pokemon/PokemonSprite";

interface Props {
  pokedex: Pokemon[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
  placeholder?: string;
}

function canonical(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function PokemonMultiSelect({
  pokedex,
  selected,
  onChange,
  max = 6,
  placeholder,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const byId = useMemo(() => {
    const map = new Map<string, Pokemon>();
    for (const p of pokedex) map.set(canonical(p.name), p);
    return map;
  }, [pokedex]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pokedex
      .filter((p) => p.name.toLowerCase().includes(q))
      .filter((p) => !selected.includes(canonical(p.name)))
      .slice(0, 8);
  }, [pokedex, query, selected]);

  const addPick = (p: Pokemon) => {
    if (selected.length >= max) return;
    onChange([...selected, canonical(p.name)]);
    setQuery("");
  };

  const removePick = (id: string) => {
    onChange(selected.filter((s) => s !== id));
  };

  const resolvedPlaceholder =
    placeholder ?? t("common.search_placeholder");

  const atCap = selected.length >= max;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((id) => {
          const p = byId.get(id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg-elev-strong)",
                color: "var(--text)",
              }}
            >
              {p ? (
                <PokemonSprite
                  url={p.sprite_url}
                  fallbackUrl={p.sprite_fallback_url}
                  name={p.name}
                  size={16}
                />
              ) : null}
              <span>{p?.name ?? id}</span>
              <button
                type="button"
                aria-label="remove"
                onClick={() => removePick(id)}
                className="ml-0.5 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          {selected.length}/{max}
        </span>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">
          <Search size={14} />
        </div>
        <input
          type="search"
          className="input pl-7 text-xs"
          placeholder={resolvedPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={atCap}
        />
        {matches.length > 0 && (
          <ul
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border shadow-lg"
            style={{
              backgroundColor: "var(--bg-elev)",
              borderColor: "var(--border)",
            }}
          >
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addPick(p)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-elev-strong)]"
                  style={{ color: "var(--text)" }}
                >
                  <PokemonSprite
                    url={p.sprite_url}
                    fallbackUrl={p.sprite_fallback_url}
                    name={p.name}
                    size={24}
                  />
                  <span>{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
