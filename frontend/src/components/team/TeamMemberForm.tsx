import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Nature, Pokemon, PokemonType, TeamMember } from "../../lib/types";
import { ALL_NATURES, ALL_TYPES } from "../../lib/types";
import { natureLabel, typeLabel } from "../../lib/labels";
import { EVSliders } from "./EVSliders";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { SearchSelect } from "../ui/SearchSelect";

interface Props {
  slot: number;
  value: TeamMember;
  pokedex: Pokemon[];
  items: string[];
  moves: string[];
  onChange: (m: TeamMember) => void;
}

export function TeamMemberForm({ slot, value, pokedex, items, moves, onChange }: Props) {
  const { t } = useTranslation();

  const selected = useMemo(
    () => pokedex.find((p) => p.id === value.species || p.name === value.species),
    [pokedex, value.species],
  );

  const setMove = (i: number, mv: string | null) => {
    const next = [...value.moves];
    next[i] = mv ?? "";
    onChange({ ...value, moves: next });
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center">
          {selected ? (
            <PokemonSprite
              url={selected.sprite_url}
              fallbackUrl={selected.sprite_fallback_url}
              name={selected.name}
              size={64}
            />
          ) : (
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-700" />
          )}
        </div>
        <div className="flex-1">
          <label className="label">Slot {slot + 1}</label>
          <SearchSelect<Pokemon>
            value={selected ?? null}
            options={pokedex}
            onChange={(p) => onChange({ ...value, species: p?.name ?? "" })}
            getOptionLabel={(p) => p.name}
            getOptionKey={(p) => p.id}
            placeholder={t("team_builder.pokemon")}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">{t("team_builder.item")}</label>
          <SearchSelect<string>
            value={value.item}
            options={items}
            onChange={(it) => onChange({ ...value, item: it })}
            placeholder={t("team_builder.item")}
            className="mt-1"
          />
        </div>
        <div>
          <label className="label">{t("team_builder.ability")}</label>
          <SearchSelect<string>
            value={value.ability}
            options={selected?.abilities ?? []}
            onChange={(ab) => onChange({ ...value, ability: ab })}
            placeholder={t("team_builder.ability")}
            disabled={!selected}
            className="mt-1"
          />
        </div>
        <div>
          <label className="label">{t("team_builder.nature")}</label>
          <SearchSelect<Nature>
            value={value.nature}
            options={[...ALL_NATURES]}
            onChange={(n) => onChange({ ...value, nature: n })}
            getOptionLabel={(n) => natureLabel(t, n)}
            placeholder={t("team_builder.nature")}
            className="mt-1"
          />
        </div>
        <div>
          <label className="label">{t("team_builder.tera_type")}</label>
          <SearchSelect<PokemonType>
            value={value.tera_type}
            options={[...ALL_TYPES]}
            onChange={(ty) => onChange({ ...value, tera_type: ty })}
            getOptionLabel={(ty) => typeLabel(t, ty)}
            placeholder={t("team_builder.tera_type")}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="label">{t("team_builder.moves")}</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <SearchSelect<string>
              key={i}
              value={value.moves[i] || null}
              options={moves}
              onChange={(mv) => setMove(i, mv)}
              placeholder={`${t("team_builder.moves")} ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="label">{t("team_builder.evs")}</label>
        <div className="mt-1">
          <EVSliders value={value.evs} onChange={(evs) => onChange({ ...value, evs })} />
        </div>
      </div>
    </div>
  );
}
