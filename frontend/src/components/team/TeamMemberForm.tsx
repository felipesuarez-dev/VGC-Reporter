import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type {
  MoveSummary,
  Nature,
  Pokemon,
  PokemonType,
  TeamMember,
} from "../../lib/types";
import { ALL_NATURES } from "../../lib/types";
import { natureLabel } from "../../lib/labels";
import { ipc } from "../../lib/ipc";
import { useLocalize } from "../../hooks/useTranslations";
import { EVSliders } from "./EVSliders";
import { PokemonSprite } from "../pokemon/PokemonSprite";
import { TypeBadge } from "../pokemon/TypeBadge";
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
  const localize = useLocalize();

  const speciesKey = value.species.trim();
  const { data: speciesMoves = [] } = useQuery({
    queryKey: ["moves-for-species", speciesKey],
    queryFn: () => ipc.listMovesForSpecies(speciesKey),
    enabled: speciesKey.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const moveOptions: MoveSummary[] = speciesMoves.length > 0
    ? speciesMoves
    : moves.map((name) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        name,
        type_: "Normal" as PokemonType,
        category: "Status",
      }));
  const moveByName = useMemo(() => {
    const m = new Map<string, MoveSummary>();
    for (const mv of moveOptions) m.set(mv.name, mv);
    return m;
  }, [moveOptions]);

  const selected = useMemo(
    () => pokedex.find((p) => p.id === value.species || p.name === value.species),
    [pokedex, value.species],
  );

  const setMove = (i: number, mv: MoveSummary | null) => {
    const next = [...value.moves];
    next[i] = mv?.name ?? "";
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
              homeUrl={selected.home_sprite_url}
              name={selected.name}
              size={64}
            />
          ) : (
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-[var(--border)]" />
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
            getOptionLabel={(it) => localize("item", it)}
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
            getOptionLabel={(ab) => localize("ability", ab)}
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
      </div>

      <div>
        <label className="label">{t("team_builder.moves")}</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => {
            const current = value.moves[i]
              ? moveByName.get(value.moves[i]) ?? {
                  id: value.moves[i],
                  name: value.moves[i],
                  type_: "Normal" as PokemonType,
                  category: "Status" as const,
                }
              : null;
            return (
              <SearchSelect<MoveSummary>
                key={i}
                value={current}
                options={moveOptions}
                onChange={(mv) => setMove(i, mv)}
                getOptionLabel={(m) => localize("move", m.name)}
                getOptionKey={(m) => m.id}
                placeholder={`${t("team_builder.moves")} ${i + 1}`}
                renderOption={(opt) => (
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{localize("move", opt.name)}</span>
                    <TypeBadge type={opt.type_} />
                  </span>
                )}
              />
            );
          })}
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
