import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  calculate,
  Generations,
  Pokemon as CalcPokemon,
  Move as CalcMove,
  Field,
} from "@smogon/calc";
import { ipc } from "../lib/ipc";
import { queryKeys } from "../lib/queryKeys";
import {
  ALL_NATURES,
  type EvSpread,
  type MoveSummary,
  type Nature,
  type Pokemon,
  type PokemonType,
} from "../lib/types";
import { SearchSelect } from "../components/ui/SearchSelect";
import { EVSliders } from "../components/team/EVSliders";
import { PokemonSprite } from "../components/pokemon/PokemonSprite";
import { TypeBadge } from "../components/pokemon/TypeBadge";
import { natureLabel, terrainLabel, weatherLabel } from "../lib/labels";
import { useLocalize } from "../hooks/useTranslations";

const GEN = Generations.get(9);

const WEATHERS = ["", "Sun", "Rain", "Sand", "Snow"] as const;
const TERRAINS = ["", "Electric", "Grassy", "Misty", "Psychic"] as const;

interface SideState {
  species: Pokemon | null;
  item: string | null;
  ability: string | null;
  nature: Nature | null;
  level: number;
  evs: EvSpread;
  moves: (string | null)[];
}

const emptyEvs: EvSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const makeSide = (level = 50): SideState => ({
  species: null,
  item: null,
  ability: null,
  nature: null,
  level,
  evs: { ...emptyEvs },
  moves: [null, null, null, null],
});

function buildCalcPokemon(side: SideState): CalcPokemon | null {
  if (!side.species) return null;
  return new CalcPokemon(GEN, side.species.name, {
    level: side.level,
    item: side.item ?? undefined,
    ability: side.ability ?? undefined,
    nature: side.nature ?? undefined,
    evs: side.evs,
  });
}

export function DamageCalc() {
  const { t } = useTranslation();
  const localize = useLocalize();

  const { data: pokedex = [] } = useQuery({
    queryKey: queryKeys.pokedex.all,
    queryFn: () => ipc.listPokemon(),
  });
  const { data: items = [] } = useQuery({
    queryKey: queryKeys.items.all,
    queryFn: () => ipc.listItems(),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });
  const { data: moves = [] } = useQuery({
    queryKey: queryKeys.moves.all,
    queryFn: () => ipc.listMoves(),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const [attacker, setAttacker] = useState<SideState>(makeSide());
  const [defender, setDefender] = useState<SideState>(makeSide());
  const [weather, setWeather] = useState<(typeof WEATHERS)[number]>("");
  const [terrain, setTerrain] = useState<(typeof TERRAINS)[number]>("");

  const location = useLocation();
  const navigate = useNavigate();
  const appliedStateRef = useRef(false);
  useEffect(() => {
    if (appliedStateRef.current) return;
    const state = location.state as
      | { species?: Pokemon; role?: "attacker" | "defender" }
      | null;
    if (!state?.species || !state.role) return;
    appliedStateRef.current = true;
    const preload: SideState = { ...makeSide(), species: state.species };
    if (state.role === "attacker") setAttacker(preload);
    else setDefender(preload);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const results = useMemo(() => {
    if (!attacker.species || !defender.species) return [];
    const atk = buildCalcPokemon(attacker);
    const def = buildCalcPokemon(defender);
    if (!atk || !def) return [];
    const field = new Field({
      weather: (weather || undefined) as never,
      terrain: (terrain || undefined) as never,
    });
    return attacker.moves
      .filter((m): m is string => Boolean(m))
      .map((mv) => {
        try {
          const move = new CalcMove(GEN, mv);
          const r = calculate(GEN, atk, def, move, field);
          const dmg = r.damage;
          const arr = Array.isArray(dmg) ? (dmg as number[]) : [dmg as number];
          const min = arr[0] ?? 0;
          const max = arr[arr.length - 1] ?? 0;
          const hp = def.maxHP();
          const minPct = ((min / hp) * 100).toFixed(1);
          const maxPct = ((max / hp) * 100).toFixed(1);
          const desc = typeof r.desc === "function" ? r.desc() : String(r.desc ?? "");
          return { move: mv, min, max, minPct, maxPct, desc };
        } catch (e) {
          return { move: mv, min: 0, max: 0, minPct: "0", maxPct: "0", desc: (e as Error).message };
        }
      });
  }, [attacker, defender, weather, terrain]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">{t("damage_calc.title")}</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          {t("damage_calc.subtitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SidePanel
          title={t("damage_calc.attacker")}
          side={attacker}
          setSide={setAttacker}
          pokedex={pokedex}
          items={items}
          moves={moves}
          showMoves
        />
        <SidePanel
          title={t("damage_calc.defender")}
          side={defender}
          setSide={setDefender}
          pokedex={pokedex}
          items={items}
          moves={moves}
        />
      </div>

      <div className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t("damage_calc.weather")}</label>
          <select
            className="input mt-1"
            value={weather}
            onChange={(e) => setWeather(e.target.value as (typeof WEATHERS)[number])}
          >
            {WEATHERS.map((w) => (
              <option key={w || "none"} value={w}>
                {w ? weatherLabel(t, w) : "—"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("damage_calc.terrain")}</label>
          <select
            className="input mt-1"
            value={terrain}
            onChange={(e) => setTerrain(e.target.value as (typeof TERRAINS)[number])}
          >
            {TERRAINS.map((tr) => (
              <option key={tr || "none"} value={tr}>
                {tr ? terrainLabel(t, tr) : "—"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="label">{t("damage_calc.result")}</div>
        {results.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>—</p>
        )}
        {results.map((r) => (
          <div
            key={r.move}
            className="rounded border p-3"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg)",
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-semibold" style={{ color: "var(--text)" }}>
                {localize("move", r.move)}
              </span>
              <span className="text-sm" style={{ color: "var(--accent)" }}>
                {r.min}–{r.max} ({r.minPct}–{r.maxPct}%)
              </span>
            </div>
            <pre
              className="mt-1 whitespace-pre-wrap text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              {r.desc}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SideProps {
  title: string;
  side: SideState;
  setSide: (s: SideState) => void;
  pokedex: Pokemon[];
  items: string[];
  moves: string[];
  showMoves?: boolean;
}

function SidePanel({ title, side, setSide, pokedex, items, moves, showMoves }: SideProps) {
  const { t } = useTranslation();
  const localize = useLocalize();
  const update = (patch: Partial<SideState>) => setSide({ ...side, ...patch });
  const speciesKey = side.species?.name ?? "";
  const { data: speciesMoves = [] } = useQuery({
    queryKey: ["moves-for-species", speciesKey],
    queryFn: () => ipc.listMovesForSpecies(speciesKey),
    enabled: showMoves === true && speciesKey.length > 0,
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
  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </h2>

      {side.species && (
        <div
          className="flex items-center gap-3 rounded border p-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg)",
          }}
        >
          <PokemonSprite
            url={side.species.sprite_url}
            fallbackUrl={side.species.sprite_fallback_url}
            homeUrl={side.species.home_sprite_url}
            name={side.species.name}
            size={56}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {side.species.name}
            </div>
            <div className="flex flex-wrap gap-1">
              {side.species.types.map((ty) => (
                <TypeBadge key={ty} type={ty} />
              ))}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {side.item && <span>{localize("item", side.item)}</span>}
              {side.nature && <span> · {natureLabel(t, side.nature)}</span>}
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="label">{t("team_builder.pokemon")}</label>
        <SearchSelect<Pokemon>
          value={side.species}
          options={pokedex}
          onChange={(p) => update({ species: p, ability: null })}
          getOptionLabel={(p) => p.name}
          getOptionKey={(p) => p.id}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">{t("team_builder.item")}</label>
          <SearchSelect<string>
            value={side.item}
            options={items}
            onChange={(it) => update({ item: it })}
            getOptionLabel={(it) => localize("item", it)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="label">{t("team_builder.ability")}</label>
          <SearchSelect<string>
            value={side.ability}
            options={side.species?.abilities ?? []}
            onChange={(ab) => update({ ability: ab })}
            getOptionLabel={(ab) => localize("ability", ab)}
            disabled={!side.species}
            className="mt-1"
          />
        </div>
        <div>
          <label className="label">{t("team_builder.nature")}</label>
          <SearchSelect<Nature>
            value={side.nature}
            options={[...ALL_NATURES]}
            onChange={(n) => update({ nature: n })}
            getOptionLabel={(n) => natureLabel(t, n)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="label">{t("damage_calc.level")}</label>
          <input
            type="number"
            min={1}
            max={100}
            className="input mt-1"
            value={side.level}
            onChange={(e) => update({ level: Number(e.target.value) || 50 })}
          />
        </div>
      </div>

      <div>
        <label className="label">{t("team_builder.evs")}</label>
        <div className="mt-1">
          <EVSliders value={side.evs} onChange={(evs) => update({ evs })} />
        </div>
      </div>

      {showMoves && (
        <div>
          <label className="label">{t("team_builder.moves")}</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => {
              const raw = side.moves[i];
              const current = raw
                ? moveByName.get(raw) ?? {
                    id: raw,
                    name: raw,
                    type_: "Normal" as PokemonType,
                    category: "Status" as const,
                  }
                : null;
              return (
                <SearchSelect<MoveSummary>
                  key={i}
                  value={current}
                  options={moveOptions}
                  onChange={(mv) => {
                    const next = [...side.moves];
                    next[i] = mv?.name ?? null;
                    update({ moves: next });
                  }}
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
      )}
    </div>
  );
}
