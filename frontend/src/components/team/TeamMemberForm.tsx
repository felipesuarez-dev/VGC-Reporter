import { useMemo } from "react";
import type { Pokemon, PokemonType, TeamMember } from "../../lib/types";
import { ALL_NATURES, ALL_TYPES } from "../../lib/types";
import { EVSliders } from "./EVSliders";
import { PokemonSprite } from "../pokemon/PokemonSprite";

interface Props {
  slot: number;
  value: TeamMember;
  pokedex: Pokemon[];
  onChange: (m: TeamMember) => void;
}

export function TeamMemberForm({ slot, value, pokedex, onChange }: Props) {
  const selected = useMemo(
    () => pokedex.find((p) => p.id === value.species || p.name === value.species),
    [pokedex, value.species],
  );

  const setMove = (i: number, mv: string) => {
    const moves = [...value.moves];
    moves[i] = mv;
    onChange({ ...value, moves });
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center">
          {selected ? (
            <PokemonSprite url={selected.sprite_url} name={selected.name} size={64} />
          ) : (
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-700" />
          )}
        </div>
        <div className="flex-1">
          <label className="label">Slot {slot + 1}</label>
          <input
            type="text"
            list={`species-list-${slot}`}
            placeholder="Species"
            className="input mt-1"
            value={value.species}
            onChange={(e) => onChange({ ...value, species: e.target.value })}
          />
          <datalist id={`species-list-${slot}`}>
            {pokedex.slice(0, 500).map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Item</label>
          <input
            className="input mt-1"
            value={value.item ?? ""}
            onChange={(e) => onChange({ ...value, item: e.target.value || null })}
          />
        </div>
        <div>
          <label className="label">Ability</label>
          <input
            className="input mt-1"
            list={`abilities-${slot}`}
            value={value.ability ?? ""}
            onChange={(e) => onChange({ ...value, ability: e.target.value || null })}
          />
          <datalist id={`abilities-${slot}`}>
            {(selected?.abilities ?? []).map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">Nature</label>
          <select
            className="input mt-1"
            value={value.nature ?? ""}
            onChange={(e) =>
              onChange({ ...value, nature: (e.target.value || null) as TeamMember["nature"] })
            }
          >
            <option value="">—</option>
            {ALL_NATURES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tera Type</label>
          <select
            className="input mt-1"
            value={value.tera_type ?? ""}
            onChange={(e) =>
              onChange({ ...value, tera_type: (e.target.value || null) as PokemonType | null })
            }
          >
            <option value="">—</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Moves</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              className="input"
              placeholder={`Move ${i + 1}`}
              value={value.moves[i] ?? ""}
              onChange={(e) => setMove(i, e.target.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="label">EVs</label>
        <div className="mt-1">
          <EVSliders value={value.evs} onChange={(evs) => onChange({ ...value, evs })} />
        </div>
      </div>
    </div>
  );
}
